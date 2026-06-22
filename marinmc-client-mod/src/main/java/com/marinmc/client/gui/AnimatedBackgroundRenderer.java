package com.marinmc.client.gui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.util.Identifier;

public class AnimatedBackgroundRenderer {
    private static float frameTimer = 0.0f;
    private static int currentFrameIndex = 0;
    private static final float FRAME_DURATION = 1.0f / 15.0f; // 15 FPS -> ~0.066s per frame
    private static long lastTime = 0;
    private static int cachedFrameCount = -1;

    public static void render(DrawContext context, int width, int height) {
        int actualFrameCount = getActualFrameCount();
        
        if (actualFrameCount <= 0) {
            // Fallback to static theme texture
            context.drawTexture(
                net.minecraft.client.gl.RenderPipelines.GUI_TEXTURED,
                OverlayScreen.getThemeTexture(),
                0, 0,
                0f, 0f,
                width, height,
                width, height
            );
            return;
        }

        // Update frame timer based on system clock
        long now = System.currentTimeMillis();
        if (lastTime == 0) lastTime = now;
        float elapsedSeconds = (now - lastTime) / 1000.0f;
        lastTime = now;

        // Cap elapsed time to prevent giant skips on lag spikes
        if (elapsedSeconds > 0.1f) elapsedSeconds = 0.1f;

        frameTimer += elapsedSeconds;
        if (frameTimer >= FRAME_DURATION) {
            int framesToAdvance = (int)(frameTimer / FRAME_DURATION);
            currentFrameIndex = (currentFrameIndex + framesToAdvance) % actualFrameCount;
            frameTimer = frameTimer % FRAME_DURATION;
        }

        // Frame index is 1-based (frame_1.png, frame_2.png...)
        Identifier frameId = Identifier.of("marinmc-client", "textures/gui/bg_frames/frame_" + (currentFrameIndex + 1) + ".png");
        
        context.drawTexture(
            net.minecraft.client.gl.RenderPipelines.GUI_TEXTURED,
            frameId,
            0, 0,
            0f, 0f,
            width, height,
            width, height
        );
    }

    private static int getActualFrameCount() {
        if (cachedFrameCount != -1) return cachedFrameCount;
        
        // Scan frame_1.png, frame_2.png... and check if they can be resolved in class loader
        int count = 0;
        for (int i = 1; i <= 300; i++) {
            String path = "/assets/marinmc-client/textures/gui/bg_frames/frame_" + i + ".png";
            java.net.URL url = AnimatedBackgroundRenderer.class.getResource(path);
            if (url != null) {
                count = i;
            } else {
                break;
            }
        }
        cachedFrameCount = count;
        return cachedFrameCount;
    }
    
    public static void resetCache() {
        cachedFrameCount = -1;
    }
}
