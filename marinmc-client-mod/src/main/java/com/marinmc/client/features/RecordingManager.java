package com.marinmc.client.features;

/**
 * Tracks a manual recording session for the REC / Replay Status HUD indicator.
 *
 * Previously the indicator blinked "REC" unconditionally and was not wired to any
 * real state. This manager gives it an actual on/off toggle (bound to a keybind)
 * plus an elapsed-time counter, so the HUD reflects whether a session is running.
 */
public final class RecordingManager {
    private static boolean recording = false;
    private static long startTime = 0L;

    private RecordingManager() {}

    /** Flip the recording state; resets the elapsed timer when starting. */
    public static void toggle() {
        recording = !recording;
        startTime = recording ? System.currentTimeMillis() : 0L;
    }

    public static void stop() {
        recording = false;
        startTime = 0L;
    }

    public static boolean isRecording() {
        return recording;
    }

    /** Elapsed time as MM:SS (00:00 when idle). */
    public static String getElapsedFormatted() {
        if (!recording || startTime == 0L) return "00:00";
        long elapsed = (System.currentTimeMillis() - startTime) / 1000L;
        long minutes = elapsed / 60L;
        long seconds = elapsed % 60L;
        return String.format("%02d:%02d", minutes, seconds);
    }
}
