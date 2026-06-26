package com.marinmc.client.features;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * Real chat-macro system. Up to {@link #SLOTS} configurable messages stored in
 * config/marinmc-macros.json; each slot is bound to a keybind and, when pressed,
 * is sent to chat (or as a command if it starts with '/'). Replaces the old
 * placeholder "Chat Macros" element that always showed 0.
 */
public final class ChatMacroManager {
    public static final int SLOTS = 5;
    private static final Gson GSON = new Gson();
    private static final File FILE = new File(FabricLoader.getInstance().getConfigDir().toFile(), "marinmc-macros.json");
    private static final List<String> macros = new ArrayList<>();
    private static boolean loaded = false;

    private ChatMacroManager() {}

    public static synchronized void ensureLoaded() {
        if (loaded) return;
        loaded = true;
        for (int i = 0; i < SLOTS; i++) macros.add("");
        if (!FILE.exists()) { save(); return; }
        try (FileReader r = new FileReader(FILE)) {
            JsonObject obj = GSON.fromJson(r, JsonObject.class);
            if (obj != null && obj.has("macros")) {
                JsonArray arr = obj.getAsJsonArray("macros");
                for (int i = 0; i < SLOTS && i < arr.size(); i++) {
                    macros.set(i, arr.get(i).isJsonNull() ? "" : arr.get(i).getAsString());
                }
            }
        } catch (Exception e) {
            System.err.println("[MarinMC] Failed to load macros: " + e.getMessage());
        }
    }

    public static void save() {
        JsonObject obj = new JsonObject();
        JsonArray arr = new JsonArray();
        for (String m : macros) arr.add(m == null ? "" : m);
        obj.add("macros", arr);
        try (FileWriter w = new FileWriter(FILE)) {
            GSON.toJson(obj, w);
        } catch (Exception e) {
            System.err.println("[MarinMC] Failed to save macros: " + e.getMessage());
        }
    }

    public static String get(int i) {
        ensureLoaded();
        return (i >= 0 && i < macros.size() && macros.get(i) != null) ? macros.get(i) : "";
    }

    public static void set(int i, String value) {
        ensureLoaded();
        if (i >= 0 && i < macros.size()) {
            macros.set(i, value == null ? "" : value);
            save();
        }
    }

    public static List<String> all() {
        ensureLoaded();
        return macros;
    }

    public static int count() {
        ensureLoaded();
        int c = 0;
        for (String m : macros) if (m != null && !m.trim().isEmpty()) c++;
        return c;
    }

    /** Send macro slot i to chat, or as a command when it starts with '/'. */
    public static void send(MinecraftClient mc, int i) {
        ensureLoaded();
        if (mc == null || mc.player == null) return;
        String msg = get(i).trim();
        if (msg.isEmpty()) return;
        if (msg.startsWith("/")) {
            mc.player.networkHandler.sendChatCommand(msg.substring(1));
        } else {
            mc.player.networkHandler.sendChatMessage(msg);
        }
    }
}
