package com.marinmc.client.cosmetics;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.client.util.SkinTextures;
import net.minecraft.util.Identifier;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.io.InputStreamReader;
import java.io.ByteArrayInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public class CosmeticProfile {
    private static final Map<String, CosmeticProfile> PROFILE_CACHE = new ConcurrentHashMap<>();
    private static final Gson GSON = new Gson();

    private final String username;
    private String skinType = "username";
    private String skinVal = "";
    private String capeUrl = "";
    private String modelType = "classic";
    private boolean wingsEnabled = false;
    private String hatName = "";
    private String wingsName = "";
    private String staffName = "";
    private String petName = "";

    private Identifier customSkinId = null;
    private Identifier customCapeId = null;
    private boolean texturesRegistered = false;

    public CosmeticProfile(String username) {
        this.username = username;
    }

    public String getUsername() { return username; }
    public String getSkinType() { return skinType; }
    public String getSkinVal() { return skinVal; }
    public String getCapeUrl() { return capeUrl; }
    public String getModelType() { return modelType; }
    public boolean isWingsEnabled() { return wingsEnabled; }
    public String getHatName() { return hatName; }
    public String getWingsName() { return wingsName; }
    public String getStaffName() { return staffName; }
    public String getPetName() { return petName; }

    public Identifier getCustomSkinId() { return customSkinId; }
    public Identifier getCustomCapeId() { return customCapeId; }

    private static String cachedApiUrl = null;

    public static String getApiUrl() {
        if (cachedApiUrl != null) return cachedApiUrl;
        String apiUrl = "http://localhost:3000/api";
        try {
            MinecraftClient client = MinecraftClient.getInstance();
            java.io.File configFile = new java.io.File(client.runDirectory, "config/marinmc-cosmetics.json");
            if (configFile.exists()) {
                String content = new String(java.nio.file.Files.readAllBytes(configFile.toPath()), java.nio.charset.StandardCharsets.UTF_8);
                if (content.contains("\"apiUrl\"")) {
                    int idx = content.indexOf("\"apiUrl\"");
                    int colon = content.indexOf(":", idx);
                    int startQuote = content.indexOf("\"", colon);
                    int endQuote = content.indexOf("\"", startQuote + 1);
                    if (startQuote != -1 && endQuote != -1) {
                        apiUrl = content.substring(startQuote + 1, endQuote);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        cachedApiUrl = apiUrl;
        return apiUrl;
    }

    public static String getEmoteWebSocketUrl() {
        String apiUrl = getApiUrl();
        String wsUrl;
        if (apiUrl.startsWith("https://")) {
            wsUrl = "wss://" + apiUrl.substring(8);
        } else if (apiUrl.startsWith("http://")) {
            wsUrl = "ws://" + apiUrl.substring(7);
        } else {
            wsUrl = "ws://" + apiUrl;
        }

        if (wsUrl.endsWith("/api")) {
            wsUrl = wsUrl.substring(0, wsUrl.length() - 4);
        }
        if (wsUrl.endsWith("/api/")) {
            wsUrl = wsUrl.substring(0, wsUrl.length() - 5);
        }
        if (!wsUrl.endsWith("/")) {
            wsUrl += "/";
        }
        wsUrl += "emotes";
        
        return wsUrl;
    }

    private static java.net.URI emoteWebSocketUri = null;

    public static java.net.URI getEmoteWebSocketUri() {
        if (emoteWebSocketUri != null) return emoteWebSocketUri;
        try {
            emoteWebSocketUri = java.net.URI.create(getEmoteWebSocketUrl());
        } catch (Exception e) {
            e.printStackTrace();
            emoteWebSocketUri = java.net.URI.create("ws://localhost:3000/emotes");
        }
        return emoteWebSocketUri;
    }

    /**
     * Get or fetch profile asynchronously for a username
     */
    public static CosmeticProfile getProfile(String username) {
        if (username == null || username.trim().isEmpty()) return null;
        String key = username.toLowerCase();
        CosmeticProfile profile = PROFILE_CACHE.get(key);
        if (profile == null) {
            profile = new CosmeticProfile(username);
            PROFILE_CACHE.put(key, profile);
            profile.fetchAsync();
        }
        return profile;
    }

    private void fetchAsync() {
        CompletableFuture.runAsync(() -> {
            try {
                URL url = new URL(getApiUrl() + "/public/users/" + username + "/cosmetics");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);

                if (conn.getResponseCode() == 200) {
                    try (InputStreamReader reader = new InputStreamReader(conn.getInputStream())) {
                        JsonObject obj = GSON.fromJson(reader, JsonObject.class);
                        if (obj != null) {
                            if (obj.has("skinType")) this.skinType = obj.get("skinType").getAsString();
                            if (obj.has("skinVal")) this.skinVal = obj.get("skinVal").getAsString();
                            if (obj.has("capeUrl")) this.capeUrl = obj.get("capeUrl").getAsString();
                            if (obj.has("modelType")) this.modelType = obj.get("modelType").getAsString();
                            if (obj.has("wingsEnabled")) this.wingsEnabled = obj.get("wingsEnabled").getAsBoolean();
                            if (obj.has("hatName")) this.hatName = obj.get("hatName").getAsString();
                            if (obj.has("wingsName")) this.wingsName = obj.get("wingsName").getAsString();
                            if (obj.has("staffName")) this.staffName = obj.get("staffName").getAsString();
                            if (obj.has("petName")) this.petName = obj.get("petName").getAsString();
                        }
                    }
                    registerTextures();
                }
            } catch (Exception e) {
                System.err.println("[MarinMC] Failed to fetch cosmetics for player " + username + ": " + e.getMessage());
            }
        });
    }

    private synchronized void registerTextures() {
        if (texturesRegistered) return;
        texturesRegistered = true;

        MinecraftClient client = MinecraftClient.getInstance();

        // 1. Skin registration
        if ("file".equals(skinType) && skinVal != null && !skinVal.trim().isEmpty()) {
            try {
                byte[] bytes = Base64.getDecoder().decode(skinVal);
                client.execute(() -> {
                    try {
                        NativeImage image = NativeImage.read(new ByteArrayInputStream(bytes));
                        NativeImageBackedTexture texture = new NativeImageBackedTexture(() -> "skin_" + username.toLowerCase(), image);
                        Identifier skinId = Identifier.of("marinmc-client", "textures/skins/" + username.toLowerCase());
                        client.getTextureManager().registerTexture(skinId, texture);
                        this.customSkinId = skinId;
                        System.out.println("[MarinMC] Custom skin registered for " + username);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else if ("username".equals(skinType) && skinVal != null && !skinVal.trim().isEmpty() && !skinVal.equalsIgnoreCase(username)) {
            // Fetch another player's skin
            CompletableFuture.runAsync(() -> {
                try {
                    URL url = new URL("https://mc-heads.net/skin/" + skinVal);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    if (conn.getResponseCode() == 200) {
                        byte[] bytes;
                        try (java.io.InputStream is = conn.getInputStream()) {
                            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                            byte[] buffer = new byte[4096];
                            int len;
                            while ((len = is.read(buffer)) != -1) {
                                bos.write(buffer, 0, len);
                            }
                            bytes = bos.toByteArray();
                        }
                        client.execute(() -> {
                            try {
                                NativeImage image = NativeImage.read(new ByteArrayInputStream(bytes));
                                NativeImageBackedTexture texture = new NativeImageBackedTexture(() -> "skin_" + username.toLowerCase(), image);
                                Identifier skinId = Identifier.of("marinmc-client", "textures/skins/" + username.toLowerCase());
                                client.getTextureManager().registerTexture(skinId, texture);
                                this.customSkinId = skinId;
                                System.out.println("[MarinMC] Username skin registered for " + username + " (skin reference: " + skinVal + ")");
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                } catch (Exception e) {
                    System.err.println("[MarinMC] Failed to download skin for " + username + " from reference " + skinVal);
                }
            });
        }

        // 2. Cape registration
        if (capeUrl != null && !capeUrl.trim().isEmpty()) {
            CompletableFuture.runAsync(() -> {
                try {
                    URL url = new URL(capeUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    if (conn.getResponseCode() == 200) {
                        byte[] bytes;
                        try (java.io.InputStream is = conn.getInputStream()) {
                            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                            byte[] buffer = new byte[4096];
                            int len;
                            while ((len = is.read(buffer)) != -1) {
                                bos.write(buffer, 0, len);
                            }
                            bytes = bos.toByteArray();
                        }
                        client.execute(() -> {
                            try {
                                NativeImage image = NativeImage.read(new ByteArrayInputStream(bytes));
                                NativeImageBackedTexture texture = new NativeImageBackedTexture(() -> "cape_" + username.toLowerCase(), image);
                                Identifier capeId = Identifier.of("marinmc-client", "textures/capes/" + username.toLowerCase());
                                client.getTextureManager().registerTexture(capeId, texture);
                                this.customCapeId = capeId;
                                System.out.println("[MarinMC] Custom cape registered for " + username);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                } catch (Exception e) {
                    System.err.println("[MarinMC] Failed to download cape for " + username + " from URL: " + capeUrl);
                }
            });
        }
    }

    public SkinTextures getModifiedSkinTextures(SkinTextures original) {
        if (customSkinId == null && customCapeId == null && "classic".equals(modelType)) {
            return original;
        }

        Identifier skin = customSkinId != null ? customSkinId : original.texture();
        Identifier cape = customCapeId != null ? customCapeId : original.capeTexture();
        Identifier elytra = customCapeId != null ? customCapeId : original.elytraTexture();
        
        SkinTextures.Model model = original.model();
        if ("slim".equalsIgnoreCase(modelType)) {
            model = SkinTextures.Model.SLIM;
        } else if ("classic".equalsIgnoreCase(modelType)) {
            model = SkinTextures.Model.WIDE;
        }

        return new SkinTextures(
            skin,
            original.textureUrl(),
            cape,
            elytra,
            model,
            original.secure()
        );
    }
}
