package com.marinmc.client.cosmetics;

import com.google.gson.Gson;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public class CosmeticProfile {
    private static final Map<UUID, CosmeticProfile> PROFILE_CACHE = new ConcurrentHashMap<>();
    private static final Gson GSON = new Gson();

    private final List<String> activeCosmetics = new ArrayList<>();
    private final Map<String, String> textures = new HashMap<>();

    public CosmeticProfile() {
    }

    public List<String> getActiveCosmetics() {
        return activeCosmetics;
    }

    public String getTexture(String cosmeticId) {
        return textures.get(cosmeticId);
    }

    public boolean hasCosmetic(String cosmeticId) {
        return activeCosmetics.contains(cosmeticId);
    }

    private static class CosmeticsResponse {
        Map<String, Map<String, String>> players;
    }

    /**
     * Asynchronously query cosmetics profile from API database for user UUID
     */
    public static CompletableFuture<CosmeticProfile> getProfileAsync(UUID uuid) {
        if (PROFILE_CACHE.containsKey(uuid)) {
            return CompletableFuture.completedFuture(PROFILE_CACHE.get(uuid));
        }

        return CompletableFuture.supplyAsync(() -> {
            CosmeticProfile profile = new CosmeticProfile();
            try {
                URL url = new URL("https://raw.githubusercontent.com/musbabaff/marinmc-launcher/main/assets/cosmetics.json");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(3000);

                if (conn.getResponseCode() == 200) {
                    try (InputStreamReader reader = new InputStreamReader(conn.getInputStream())) {
                        CosmeticsResponse response = GSON.fromJson(reader, CosmeticsResponse.class);
                        if (response != null && response.players != null) {
                            Map<String, String> items = response.players.get(uuid.toString());
                            if (items == null) {
                                // Fallback username lookup mappings for testing
                                if (uuid.toString().contains("a0a0a0")) {
                                    items = response.players.get("dbrn");
                                } else {
                                    items = response.players.get("steve");
                                }
                            }
                            
                            if (items != null) {
                                for (Map.Entry<String, String> entry : items.entrySet()) {
                                    profile.activeCosmetics.add(entry.getKey());
                                    profile.textures.put(entry.getKey(), entry.getValue());
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to fetch cosmetics profile for " + uuid + ": " + e.getMessage());
            }

            PROFILE_CACHE.put(uuid, profile);
            return profile;
        });
    }
}
