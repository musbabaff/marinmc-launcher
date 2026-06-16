package com.marinmc.client.features;

import com.marinmc.client.gui.OverlayScreen;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

/**
 * FreelookHandler manages a 360-degree free-look camera mode.
 * When the Freelook key (default: F) is held, the camera rotates
 * independently from the player's movement direction.
 */
public class FreelookHandler {
    private static final FreelookHandler INSTANCE = new FreelookHandler();

    private boolean active = false;
    private float cameraYaw = 0f;
    private float cameraPitch = 0f;
    private float playerYaw = 0f;
    private float playerPitch = 0f;
    private int perspectiveBefore = 0;

    // Config keys
    public static final String CONFIG_KEY = "freelook";
    public static final String PERSPECTIVE_KEY = "freelook_perspective"; // "third_back", "third_front", "first"
    public static final String INVERT_Y_KEY = "freelook_invert_y";

    private static KeyBinding freelookKeyBinding;

    public static FreelookHandler getInstance() {
        return INSTANCE;
    }

    /**
     * Register keybinding during mod init.
     */
    public static void registerKeybinding() {
        freelookKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.freelook",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_F,
            "category.marinmc.client"
        ));
    }

    public static KeyBinding getKeybinding() {
        return freelookKeyBinding;
    }

    /**
     * Called every client tick to check if freelook should activate/deactivate.
     */
    public void tick() {
        boolean modEnabled = OverlayScreen.configStates.getOrDefault(CONFIG_KEY, false);
        if (!modEnabled) {
            if (active) {
                deactivate();
            }
            return;
        }

        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player == null || mc.currentScreen != null) {
            if (active) {
                deactivate();
            }
            return;
        }

        boolean keyHeld = freelookKeyBinding.isPressed();

        if (keyHeld && !active) {
            activate(mc);
        } else if (!keyHeld && active) {
            deactivate();
        }
    }

    private void activate(MinecraftClient mc) {
        active = true;
        playerYaw = mc.player.getYaw();
        playerPitch = mc.player.getPitch();
        cameraYaw = playerYaw;
        cameraPitch = playerPitch;

        // Store current perspective and optionally switch to third person
        perspectiveBefore = mc.options.getPerspective().ordinal();

        String perspPref = OverlayScreen.configStrings.getOrDefault(PERSPECTIVE_KEY, "third_back");
        switch (perspPref) {
            case "third_front":
                mc.options.setPerspective(net.minecraft.client.option.Perspective.THIRD_PERSON_FRONT);
                break;
            case "third_back":
                mc.options.setPerspective(net.minecraft.client.option.Perspective.THIRD_PERSON_BACK);
                break;
            default:
                // Keep first person
                break;
        }
    }

    private void deactivate() {
        active = false;
        MinecraftClient mc = MinecraftClient.getInstance();

        // Restore perspective
        net.minecraft.client.option.Perspective[] perspectives = net.minecraft.client.option.Perspective.values();
        if (perspectiveBefore >= 0 && perspectiveBefore < perspectives.length) {
            mc.options.setPerspective(perspectives[perspectiveBefore]);
        }

        // Restore player rotation (camera was decoupled)
        if (mc.player != null) {
            mc.player.setYaw(playerYaw);
            mc.player.setPitch(playerPitch);
        }
    }

    /**
     * Called from CameraMixin to handle mouse movement while freelook is active.
     * Returns true if the event should be consumed (player should not rotate).
     */
    public boolean onMouseMove(double deltaX, double deltaY) {
        if (!active) return false;

        boolean invertY = OverlayScreen.configStates.getOrDefault(INVERT_Y_KEY, false);
        float sensitivity = 0.15f;

        cameraYaw += (float) (deltaX * sensitivity);
        cameraPitch += (float) (deltaY * sensitivity * (invertY ? -1 : 1));
        cameraPitch = Math.max(-90f, Math.min(90f, cameraPitch));

        // Keep player facing original direction
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player != null) {
            mc.player.setYaw(playerYaw);
            mc.player.setPitch(playerPitch);
        }

        return true;
    }

    public boolean isActive() {
        return active;
    }

    public float getCameraYaw() {
        return cameraYaw;
    }

    public float getCameraPitch() {
        return cameraPitch;
    }

    public float getPlayerYaw() {
        return playerYaw;
    }

    public float getPlayerPitch() {
        return playerPitch;
    }
}
