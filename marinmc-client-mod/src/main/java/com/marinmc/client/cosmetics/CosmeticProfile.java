package com.marinmc.client.cosmetics;

import net.minecraft.util.Identifier;
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

    private static Identifier customSkinId = null;
    private static Identifier customCapeId = null;
    private static boolean loadedLocalCosmetics = false;

    public static void loadLocalCosmetics() {
        if (loadedLocalCosmetics) return;
        loadedLocalCosmetics = true;

        try {
            net.minecraft.client.MinecraftClient client = net.minecraft.client.MinecraftClient.getInstance();
            java.io.File configFile = new java.io.File(client.runDirectory, "config/marinmc-cosmetics.json");
            if (!configFile.exists()) return;

            String content = new String(java.nio.file.Files.readAllBytes(configFile.toPath()), java.nio.charset.StandardCharsets.UTF_8);
            
            String skinType = "username";
            if (content.contains("\"skinType\": \"file\"") || content.contains("\"skinType\":\"file\"")) {
                skinType = "file";
            }

            if ("file".equals(skinType)) {
                java.io.File skinFile = new java.io.File(client.runDirectory, "skins/active_skin.png");
                if (skinFile.exists()) {
                    try (java.io.FileInputStream fis = new java.io.FileInputStream(skinFile)) {
                        net.minecraft.client.texture.NativeImage nativeImage = net.minecraft.client.texture.NativeImage.read(fis);
                        net.minecraft.client.texture.NativeImageBackedTexture texture = new net.minecraft.client.texture.NativeImageBackedTexture(() -> "active_skin", nativeImage);
                        Identifier skinId = Identifier.of("marinmc-client", "textures/skins/active_skin");
                        client.getTextureManager().registerTexture(skinId, texture);
                        customSkinId = skinId;
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }

            String capeUrl = null;
            if (content.contains("\"capeUrl\"")) {
                int idx = content.indexOf("\"capeUrl\"");
                int colon = content.indexOf(":", idx);
                int startQuote = content.indexOf("\"", colon);
                int endQuote = content.indexOf("\"", startQuote + 1);
                if (startQuote != -1 && endQuote != -1) {
                    capeUrl = content.substring(startQuote + 1, endQuote);
                }
            }

            if (capeUrl != null && !capeUrl.isEmpty()) {
                final String finalCapeUrl = capeUrl;
                CompletableFuture.runAsync(() -> {
                    try {
                        java.net.URL url = new java.net.URL(finalCapeUrl);
                        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setConnectTimeout(5000);
                        conn.setReadTimeout(5000);
                        if (conn.getResponseCode() == 200) {
                            try (java.io.InputStream is = conn.getInputStream()) {
                                net.minecraft.client.texture.NativeImage nativeImage = net.minecraft.client.texture.NativeImage.read(is);
                                net.minecraft.client.texture.NativeImageBackedTexture texture = new net.minecraft.client.texture.NativeImageBackedTexture(() -> "active_cape", nativeImage);
                                Identifier capeId = Identifier.of("marinmc-client", "textures/capes/active_cape");
                                client.execute(() -> {
                                    client.getTextureManager().registerTexture(capeId, texture);
                                    customCapeId = capeId;
                                });
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static net.minecraft.client.util.SkinTextures getLocalSkinTextures(net.minecraft.client.util.SkinTextures original) {
        loadLocalCosmetics();
        if (customSkinId == null && customCapeId == null) {
            return original;
        }

        Identifier skin = customSkinId != null ? customSkinId : original.texture();
        Identifier cape = customCapeId != null ? customCapeId : original.capeTexture();
        Identifier elytra = customCapeId != null ? customCapeId : original.elytraTexture();

        return new net.minecraft.client.util.SkinTextures(
            skin,
            original.textureUrl(),
            cape,
            elytra,
            original.model(),
            original.secure()
        );
    }
}
