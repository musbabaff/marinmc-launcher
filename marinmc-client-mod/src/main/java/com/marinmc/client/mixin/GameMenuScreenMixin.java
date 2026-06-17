package com.marinmc.client.mixin;

import com.marinmc.client.gui.GlassButtonWidget;
import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.option.LanguageOptionsScreen;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.client.gl.RenderPipelines;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(GameMenuScreen.class)
public class GameMenuScreenMixin extends Screen {
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    private int hoveredIconIndex = -1;

    protected GameMenuScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        this.clearChildren();

        int btnW = 200;
        int btnH = 20;
        int centerX = this.width / 2 - btnW / 2;
        int centerY = this.height / 2 - 10;

        // Emotes button — i18n
        this.addDrawableChild(new GlassButtonWidget(centerX, centerY, btnW, btnH,
            Text.translatable("marinmc.menu.emotes"),
            button -> {
                if (this.client != null && this.client.player != null) {
                    this.client.player.sendMessage(Text.literal("§bMarinMC Client §f» §aEmote'lar Yakında!"), true);
                }
            }
        ));

        // Mods button — opens OverlayScreen — i18n
        this.addDrawableChild(new GlassButtonWidget(centerX, centerY + 26, btnW, btnH,
            Text.translatable("marinmc.menu.mods"),
            button -> {
                if (this.client != null) this.client.setScreen(new OverlayScreen());
            }
        ));

        // Disconnect button — i18n
        this.addDrawableChild(new GlassButtonWidget(centerX, centerY + 52, btnW, btnH,
            Text.translatable("marinmc.menu.disconnect"),
            button -> {
                if (this.client != null && this.client.world != null) {
                    this.client.disconnect(new TitleScreen(), false);
                }
            }
        ));
    }

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void onRender(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        // Darker overlay
        context.fill(0, 0, this.width, this.height, 0x70000000);

        // Logo + "MARINMC LAUNCHER"
        int logoSize = 48;
        int logoX = this.width / 2 - logoSize / 2;
        int logoY = this.height / 2 - 90;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoX, logoY,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );
        context.drawCenteredTextWithShadow(this.textRenderer, "MARINMC LAUNCHER", this.width / 2, logoY + logoSize + 4, 0xFFFFFFFF);

        // Render widgets (3 glass center buttons)
        super.render(context, mouseX, mouseY, delta);

        // Bottom-Center Icon Bar — 5 icons (same as title screen minus exit)
        int iconCount = 5;
        int iconSize = 24;
        int iconGap = 6;
        int ibW = iconCount * iconSize + (iconCount - 1) * iconGap;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 36;
        hoveredIconIndex = -1;

        String[] symbols = {"☾", "⚙", "🌐", "⬡", "☰"};
        for (int i = 0; i < iconCount; i++) {
            int ix = ibX + i * (iconSize + iconGap);
            boolean iconHovered = mouseX >= ix && mouseX <= ix + iconSize && mouseY >= ibY && mouseY <= ibY + iconSize;

            context.fill(ix, ibY, ix + iconSize, ibY + iconSize, iconHovered ? 0x70553388 : 0x40000000);
            context.drawBorder(ix, ibY, iconSize, iconSize, iconHovered ? 0xA0B180E8 : 0x25FFFFFF);

            int symColor = iconHovered ? 0xFFFFFFFF : 0xFFA1A1AA;
            context.drawCenteredTextWithShadow(this.textRenderer, symbols[i], ix + iconSize / 2, ibY + 8, symColor);

            if (iconHovered) {
                hoveredIconIndex = i;
            }
        }

        // Tooltips — i18n
        if (hoveredIconIndex != -1) {
            String[] titleKeys = {
                "marinmc.menu.marinmc_settings",
                "marinmc.menu.minecraft_settings",
                "marinmc.menu.language",
                "marinmc.menu.realms",
                "marinmc.menu.fabric_menu"
            };
            String[] subtitleKeys = {
                "marinmc.subtitle.marinmc",
                "marinmc.subtitle.minecraft",
                "marinmc.subtitle.language",
                "marinmc.subtitle.realms",
                "marinmc.subtitle.external"
            };

            String title = Text.translatable(titleKeys[hoveredIconIndex]).getString();
            String subtitle = Text.translatable(subtitleKeys[hoveredIconIndex]).getString();

            int tw = Math.max(90, this.textRenderer.getWidth(title) + 16);
            int th = 28;
            int tx = ibX + hoveredIconIndex * (iconSize + iconGap) + iconSize / 2 - tw / 2;
            int ty = ibY - th - 8;

            context.fill(tx, ty, tx + tw, ty + th, 0xF0070408);
            context.drawBorder(tx, ty, tw, th, 0x60B180E8);
            context.drawCenteredTextWithShadow(this.textRenderer, title, tx + tw / 2, ty + 4, 0xFFFFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, subtitle, tx + tw / 2, ty + 15, 0xFF64748B);
        }

        ci.cancel();
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        // Bottom icon bar clicks
        int iconCount = 5;
        int iconSize = 24;
        int iconGap = 6;
        int ibW = iconCount * iconSize + (iconCount - 1) * iconGap;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 36;
        for (int i = 0; i < iconCount; i++) {
            int ix = ibX + i * (iconSize + iconGap);
            if (mouseX >= ix && mouseX <= ix + iconSize && mouseY >= ibY && mouseY <= ibY + iconSize) {
                executeIconAction(i);
                return true;
            }
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private void executeIconAction(int index) {
        if (this.client == null) return;
        switch (index) {
            case 0: // MarinMC Settings
                this.client.setScreen(new OverlayScreen());
                break;
            case 1: // Minecraft Settings
                this.client.setScreen(new OptionsScreen(this, this.client.options));
                break;
            case 2: // Language
                this.client.setScreen(new LanguageOptionsScreen(this, this.client.options, this.client.getLanguageManager()));
                break;
            case 3: // Minecraft Realms — actually open Realms
                try {
                    this.client.setScreen(new net.minecraft.client.realms.gui.screen.RealmsMainScreen(this));
                } catch (Exception e) {
                    if (this.client.player != null) {
                        this.client.player.sendMessage(Text.literal("§cRealms is not available."), true);
                    }
                }
                break;
            case 4: // Fabric Mod Menu — open actual Fabric mod menu
                try {
                    Class<?> modMenuClass = Class.forName("com.terraformersmc.modmenu.gui.ModsScreen");
                    Screen modMenuScreen = (Screen) modMenuClass.getConstructor(Screen.class).newInstance(this);
                    this.client.setScreen(modMenuScreen);
                } catch (Exception e) {
                    this.client.setScreen(new OverlayScreen());
                }
                break;
        }
    }
}
