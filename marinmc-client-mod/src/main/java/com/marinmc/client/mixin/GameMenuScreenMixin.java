package com.marinmc.client.mixin;

import com.marinmc.client.gui.GlassButtonWidget;
import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;
import net.minecraft.util.Util;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(GameMenuScreen.class)
public class GameMenuScreenMixin extends Screen {

    protected GameMenuScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        int btnW = 100;
        int btnH = 20;
        int btnX = 15;
        int startY = this.height / 2 - 13;

        // MarinMC Ayarları
        this.addDrawableChild(new GlassButtonWidget(btnX, startY, btnW, btnH,
            Text.translatable("marinmc.menu.marinmc_settings_short"),
            button -> {
                if (this.client != null) this.client.setScreen(new OverlayScreen());
            }
        ));

        // Mod Ekle
        this.addDrawableChild(new GlassButtonWidget(btnX, startY + 26, btnW, btnH,
            Text.translatable("marinmc.menu.add_mods"),
            button -> {
                java.io.File modsDir = new java.io.File("mods");
                if (!modsDir.exists()) {
                    modsDir.mkdirs();
                }
                Util.getOperatingSystem().open(modsDir);
            }
        ));
    }
}
