package com.marinmc.client.cosmetics;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.RotationAxis;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public class CosmeticModel {
    private static final Map<String, CosmeticModel> MODELS_CACHE = new ConcurrentHashMap<>();
    private static final Gson GSON = new Gson();

    private final String name;
    private final List<Bone> bones = new ArrayList<>();
    private int textureWidth = 64;
    private int textureHeight = 64;
    private Identifier textureId = null;
    private boolean loaded = false;
    private boolean loading = false;

    public CosmeticModel(String name) {
        this.name = name;
    }

    public static CosmeticModel getModel(String name) {
        if (name == null || name.trim().isEmpty()) return null;
        CosmeticModel model = MODELS_CACHE.get(name);
        if (model == null) {
            model = new CosmeticModel(name);
            MODELS_CACHE.put(name, model);
            model.loadAsync();
        }
        return model;
    }

    private void loadAsync() {
        if (loading || loaded) return;
        loading = true;

        CompletableFuture.runAsync(() -> {
            try {
                MinecraftClient client = MinecraftClient.getInstance();
                File cacheDir = new File(client.runDirectory, "cosmetics/cache");
                File modelsDir = new File(cacheDir, "models");
                File texturesDir = new File(cacheDir, "textures");
                modelsDir.mkdirs();
                texturesDir.mkdirs();

                File modelFile = new File(modelsDir, name + ".json");
                File textureFile = new File(texturesDir, name + ".png");

                String apiUrl = CosmeticProfile.getApiUrl();
                String cdnUrl = apiUrl;
                if (cdnUrl.endsWith("/api")) {
                    cdnUrl = cdnUrl.substring(0, cdnUrl.length() - 4);
                }

                if (!modelFile.exists()) {
                    URL url = new URL(cdnUrl + "/cosmetics/models/" + name + ".geo.json");
                    downloadToFile(url, modelFile);
                }

                if (!textureFile.exists()) {
                    URL url = new URL(cdnUrl + "/cosmetics/textures/" + name + ".png");
                    downloadToFile(url, textureFile);
                }

                if (modelFile.exists()) {
                    String jsonStr = new String(Files.readAllBytes(modelFile.toPath()), java.nio.charset.StandardCharsets.UTF_8);
                    parseGeometry(jsonStr);
                }

                if (textureFile.exists()) {
                    client.execute(() -> {
                        try (FileInputStream fis = new FileInputStream(textureFile)) {
                            NativeImage image = NativeImage.read(fis);
                            NativeImageBackedTexture texture = new NativeImageBackedTexture(() -> "cosmetic_" + name, image);
                            Identifier id = Identifier.of("marinmc-client", "textures/cosmetics/" + name);
                            client.getTextureManager().registerTexture(id, texture);
                            this.textureId = id;
                            this.loaded = true;
                            this.loading = false;
                            System.out.println("[MarinMC] 3D Cosmetic loaded: " + name);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }
            } catch (Exception e) {
                System.err.println("[MarinMC] Failed to load 3D cosmetic model " + name + ": " + e.getMessage());
                loading = false;
            }
        });
    }

    private void downloadToFile(URL url, File file) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        if (conn.getResponseCode() == 200) {
            try (InputStream is = conn.getInputStream();
                 FileOutputStream fos = new FileOutputStream(file)) {
                byte[] buffer = new byte[4096];
                int len;
                while ((len = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, len);
                }
            }
        }
    }

    private void parseGeometry(String json) {
        try {
            JsonObject root = GSON.fromJson(json, JsonObject.class);
            if (root.has("minecraft:geometry")) {
                JsonArray array = root.getAsJsonArray("minecraft:geometry");
                if (array.size() > 0) {
                    JsonObject geom = array.get(0).getAsJsonObject();
                    if (geom.has("description")) {
                        JsonObject desc = geom.getAsJsonObject("description");
                        if (desc.has("texture_width")) textureWidth = desc.get("texture_width").getAsInt();
                        if (desc.has("texture_height")) textureHeight = desc.get("texture_height").getAsInt();
                    }
                    if (geom.has("bones")) {
                        JsonArray bonesArray = geom.getAsJsonArray("bones");
                        for (JsonElement el : bonesArray) {
                            JsonObject boneObj = el.getAsJsonObject();
                            Bone bone = new Bone();
                            if (boneObj.has("name")) bone.name = boneObj.get("name").getAsString();
                            if (boneObj.has("parent")) bone.parent = boneObj.get("parent").getAsString();
                            
                            if (boneObj.has("pivot")) {
                                JsonArray p = boneObj.getAsJsonArray("pivot");
                                bone.pivot = new float[]{p.get(0).getAsFloat(), p.get(1).getAsFloat(), p.get(2).getAsFloat()};
                            }
                            if (boneObj.has("rotation")) {
                                JsonArray r = boneObj.getAsJsonArray("rotation");
                                bone.rotation = new float[]{r.get(0).getAsFloat(), r.get(1).getAsFloat(), r.get(2).getAsFloat()};
                            }

                            if (boneObj.has("cubes")) {
                                JsonArray cubesArray = boneObj.getAsJsonArray("cubes");
                                for (JsonElement cel : cubesArray) {
                                    JsonObject cubeObj = cel.getAsJsonObject();
                                    Cube cube = new Cube();
                                    if (cubeObj.has("origin")) {
                                        JsonArray o = cubeObj.getAsJsonArray("origin");
                                        cube.origin = new float[]{o.get(0).getAsFloat(), o.get(1).getAsFloat(), o.get(2).getAsFloat()};
                                    }
                                    if (cubeObj.has("size")) {
                                        JsonArray s = cubeObj.getAsJsonArray("size");
                                        cube.size = new float[]{s.get(0).getAsFloat(), s.get(1).getAsFloat(), s.get(2).getAsFloat()};
                                    }
                                    if (cubeObj.has("uv")) {
                                        JsonArray u = cubeObj.getAsJsonArray("uv");
                                        cube.uv = new float[]{u.get(0).getAsFloat(), u.get(1).getAsFloat()};
                                    }
                                    if (cubeObj.has("inflate")) {
                                        cube.inflate = cubeObj.get("inflate").getAsFloat();
                                    }
                                    bone.cubes.add(cube);
                                }
                            }
                            this.bones.add(bone);
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void render(MatrixStack matrices, VertexConsumerProvider vertexConsumers, int light, int overlay, String attachmentBone, float ageInTicks) {
        if (!loaded || textureId == null) return;

        VertexConsumer consumer = vertexConsumers.getBuffer(RenderLayer.getEntityTranslucent(textureId));

        matrices.push();

        matrices.scale(1.0f / 16.0f, 1.0f / 16.0f, 1.0f / 16.0f);

        for (Bone bone : bones) {
            if (attachmentBone != null && !attachmentBone.equalsIgnoreCase(bone.name) && !attachmentBone.equalsIgnoreCase(bone.parent)) {
                continue;
            }

            matrices.push();

            matrices.translate(bone.pivot[0], bone.pivot[1], bone.pivot[2]);

            if (bone.rotation != null) {
                matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(bone.rotation[2]));
                matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(bone.rotation[1]));
                matrices.multiply(RotationAxis.POSITIVE_X.rotationDegrees(bone.rotation[0]));
            }

            if ("wings".equalsIgnoreCase(attachmentBone)) {
                float flap = (float) Math.sin(ageInTicks * 0.2f) * 15.0f;
                if (bone.name.toLowerCase().contains("left")) {
                    matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(flap));
                } else if (bone.name.toLowerCase().contains("right")) {
                    matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(-flap));
                }
            } else if ("pet".equalsIgnoreCase(attachmentBone)) {
                float hover = (float) Math.sin(ageInTicks * 0.1f) * 2.0f;
                matrices.translate(0, hover, 0);
                matrices.multiply(RotationAxis.POSITIVE_Y.rotationDegrees(ageInTicks * 2.0f));
            }

            matrices.translate(-bone.pivot[0], -bone.pivot[1], -bone.pivot[2]);

            for (Cube cube : bone.cubes) {
                renderCube(matrices, consumer, cube, light, overlay);
            }

            matrices.pop();
        }

        matrices.pop();
    }

    private void renderCube(MatrixStack matrices, VertexConsumer consumer, Cube cube, int light, int overlay) {
        float minX = cube.origin[0] - cube.inflate;
        float minY = cube.origin[1] - cube.inflate;
        float minZ = cube.origin[2] - cube.inflate;
        float maxX = cube.origin[0] + cube.size[0] + cube.inflate;
        float maxY = cube.origin[1] + cube.size[1] + cube.inflate;
        float maxZ = cube.origin[2] + cube.size[2] + cube.inflate;

        float uWidth = cube.size[0];
        float vHeight = cube.size[1];
        float dDepth = cube.size[2];

        float u0 = cube.uv[0];
        float v0 = cube.uv[1];

        drawFace(matrices, consumer, minX, minY, maxZ, maxX, maxY, maxZ, u0 + dDepth, v0 + dDepth, u0 + dDepth + uWidth, v0 + dDepth + vHeight, light, overlay, 0, 0, 1);
        drawFace(matrices, consumer, maxX, minY, minZ, minX, maxY, minZ, u0 + 2 * dDepth + uWidth, v0 + dDepth, u0 + 2 * dDepth + 2 * uWidth, v0 + dDepth + vHeight, light, overlay, 0, 0, -1);
        drawFace(matrices, consumer, minX, maxY, minZ, maxX, maxY, maxZ, u0 + dDepth, v0, u0 + dDepth + uWidth, v0 + dDepth, light, overlay, 0, 1, 0);
        drawFace(matrices, consumer, minX, minY, maxZ, maxX, minY, minZ, u0 + dDepth + uWidth, v0, u0 + dDepth + 2 * uWidth, v0 + dDepth, light, overlay, 0, -1, 0);
        drawFace(matrices, consumer, maxX, minY, maxZ, maxX, maxY, minZ, u0 + dDepth + uWidth, v0 + dDepth, u0 + 2 * dDepth + uWidth, v0 + dDepth + vHeight, light, overlay, 1, 0, 0);
        drawFace(matrices, consumer, minX, minY, minZ, minX, maxY, maxZ, u0, v0 + dDepth, u0 + dDepth, v0 + dDepth + vHeight, light, overlay, -1, 0, 0);
    }

    private void drawFace(MatrixStack matrices, VertexConsumer consumer, float minX, float minY, float minZ, float maxX, float maxY, float maxZ, float uStart, float vStart, float uEnd, float vEnd, int light, int overlay, float nx, float ny, float nz) {
        float us = uStart / (float) textureWidth;
        float vs = vStart / (float) textureHeight;
        float ue = uEnd / (float) textureWidth;
        float ve = vEnd / (float) textureHeight;

        MatrixStack.Entry entry = matrices.peek();

        consumer.vertex(entry.getPositionMatrix(), minX, minY, minZ)
                .color(255, 255, 255, 255)
                .texture(us, ve)
                .overlay(overlay)
                .light(light)
                .normal(entry, nx, ny, nz);

        consumer.vertex(entry.getPositionMatrix(), maxX, minY, maxZ)
                .color(255, 255, 255, 255)
                .texture(ue, ve)
                .overlay(overlay)
                .light(light)
                .normal(entry, nx, ny, nz);

        consumer.vertex(entry.getPositionMatrix(), maxX, maxY, maxZ)
                .color(255, 255, 255, 255)
                .texture(ue, vs)
                .overlay(overlay)
                .light(light)
                .normal(entry, nx, ny, nz);

        consumer.vertex(entry.getPositionMatrix(), minX, maxY, minZ)
                .color(255, 255, 255, 255)
                .texture(us, vs)
                .overlay(overlay)
                .light(light)
                .normal(entry, nx, ny, nz);
    }

    private static class Bone {
        String name;
        String parent;
        float[] pivot = new float[]{0, 0, 0};
        float[] rotation = null;
        List<Cube> cubes = new ArrayList<>();
    }

    private static class Cube {
        float[] origin = new float[]{0, 0, 0};
        float[] size = new float[]{0, 0, 0};
        float[] uv = new float[]{0, 0};
        float inflate = 0.0f;
    }
}
