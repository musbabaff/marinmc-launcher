package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.client.gl.RenderPipelines;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TitleScreen.class)
public class TitleScreenMixin extends Screen {
    private static final Identifier BACKGROUND_TEXTURE = Identifier.of("marinmc-client", "textures/gui/background.png");
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    protected TitleScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        // Clear all default Minecraft buttons
        this.clearChildren();

        // Center primary buttons
        int btnW = 200;
        int btnH = 22;
        int btnX = this.width / 2 - btnW / 2;
        int btnY = this.height / 2 + 10;

        // Button 1: SINGLEPLAYER
        this.addDrawableChild(new OverlayScreen.PremiumButtonWidget(
            btnX, btnY, btnW, btnH,
            Text.literal("SINGLEPLAYER"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new SelectWorldScreen(this));
                }
            }
        ));

        // Button 2: MULTIPLAYER
        this.addDrawableChild(new OverlayScreen.PremiumButtonWidget(
            btnX, btnY + 25, btnW, btnH,
            Text.literal("MULTIPLAYER"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new MultiplayerScreen(this));
                }
            }
        ));

        // Top-Left User/Account button
        this.addDrawableChild(new SquareIconButtonWidget(
            15, 15, 20, 20,
            "👤", 0xFF2D7DD2,
            button -> {
                // Clicking user icon prints simple status or does cosmetics
            }
        ));

        // Top-Right Close button
        this.addDrawableChild(new SquareIconButtonWidget(
            this.width - 35, 15, 20, 20,
            "✖", 0xFFEF4444,
            button -> {
                if (this.client != null) {
                    this.client.scheduleStop();
                }
            }
        ));

        // Bottom-Center 4 Icon Buttons: Moon, Shirt, Gear, Globe
        int startX = this.width / 2 - 53;
        int startY = this.height - 40;

        // Moon Icon -> Opens OverlayScreen settings
        this.addDrawableChild(new SquareIconButtonWidget(
            startX, startY, 22, 22,
            "☾", 0xFF2D7DD2,
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OverlayScreen());
                }
            }
        ));

        // Shirt Icon -> Opens Cosmetics Profile Info
        this.addDrawableChild(new SquareIconButtonWidget(
            startX + 28, startY, 22, 22,
            "👕", 0xFFC084FC,
            button -> {
                // Cosmetics profile info placeholder
            }
        ));

        // Gear Icon -> Opens Vanilla Options
        this.addDrawableChild(new SquareIconButtonWidget(
            startX + 56, startY, 22, 22,
            "⚙", 0xFFA1A1AA,
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OptionsScreen(this, this.client.options));
                }
            }
        ));

        // Globe Icon -> Connects directly to oyna.marinmc.com
        this.addDrawableChild(new SquareIconButtonWidget(
            startX + 84, startY, 22, 22,
            "🌐", 0xFF22C55E,
            button -> {
                if (this.client != null) {
                    ServerInfo serverInfo = new ServerInfo("MarinMC", "oyna.marinmc.com", ServerInfo.ServerType.OTHER);
                    ConnectScreen.connect(
                        this, 
                        this.client, 
                        ServerAddress.parse("oyna.marinmc.com"), 
                        serverInfo, 
                        false, 
                        null
                    );
                }
            }
        ));

        // Bottom-Right floating purple gradient button (LUNAR CLIENT Style settings trigger)
        this.addDrawableChild(new PurpleGradientButtonWidget(
            this.width - 130, this.height - 55,
            115, 38,
            Text.literal("MARINMC CLIENT"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OverlayScreen());
                }
            }
        ));
    }

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void onRender(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        // Render custom pre-blurred background image covering the full screen
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            BACKGROUND_TEXTURE,
            0, 0,
            0f, 0f,
            this.width, this.height,
            this.width, this.height
        );
        
        // Darken the background slightly
        context.fill(0, 0, this.width, this.height, 0x20000000);

        // Render Hexagonal Moon Logo in the center
        int logoSize = 64;
        int logoX = this.width / 2 - logoSize / 2;
        int logoY = this.height / 2 - 95;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoX, logoY,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );

        // Draw title text below logo
        context.drawCenteredTextWithShadow(this.textRenderer, "MARINMC CLIENT", this.width / 2, logoY + logoSize + 8, 0xFFFFFFFF);

        // Render widgets (buttons)
        super.render(context, mouseX, mouseY, delta);

        // Draw bottom left version info
        String versionText = "MarinMC Client v1.21.8";
        context.drawTextWithShadow(this.textRenderer, versionText, 15, this.height - 22, 0xFFA1A1AA);

        // Draw bottom right Mojang copyright
        String copyrightText = "Copyright Mojang Studios. Do not distribute!";
        // Position it just left of the purple button or at the bottom
        context.drawTextWithShadow(this.textRenderer, copyrightText, this.width - this.textRenderer.getWidth(copyrightText) - 135, this.height - 22, 0x80FFFFFF);

        ci.cancel();
    }

    // Custom Square Icon Button Widget
    public static class SquareIconButtonWidget extends ButtonWidget {
        private final int activeColor;

        public SquareIconButtonWidget(int x, int y, int width, int height, String symbol, int activeColor, PressAction onPress) {
            super(x, y, width, height, Text.literal(symbol), onPress, DEFAULT_NARRATION_SUPPLIER);
            this.activeColor = activeColor;
        }

        @Override
        protected void renderWidget(DrawContext context, int mouseX, int mouseY, float delta) {
            if (!this.visible) return;

            boolean hovered = this.isSelected() || this.isHovered();
            
            // Draw background fill (semi-transparent dark grey)
            int bgColor = hovered ? 0x652D7DD2 : 0x50000000;
            context.fill(this.getX(), this.getY(), this.getX() + this.width, this.getY() + this.height, bgColor);
            
            // Draw thin border
            int borderColor = hovered ? activeColor : 0x25FFFFFF;
            context.drawBorder(this.getX(), this.getY(), this.width, this.height, borderColor);

            // Draw symbol centered
            int textColor = hovered ? 0xFFFFFFFF : 0xFFCCCCCC;
            context.drawCenteredTextWithShadow(
                net.minecraft.client.MinecraftClient.getInstance().textRenderer,
                this.getMessage(),
                this.getX() + this.width / 2,
                this.getY() + (this.height - 8) / 2,
                textColor
            );
        }
    }

    // Custom Purple Gradient Button Widget (Lunar Style)
    public static class PurpleGradientButtonWidget extends ButtonWidget {
        private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

        public PurpleGradientButtonWidget(int x, int y, int width, int height, Text message, PressAction onPress) {
            super(x, y, width, height, message, onPress, DEFAULT_NARRATION_SUPPLIER);
        }

        @Override
        protected void renderWidget(DrawContext context, int mouseX, int mouseY, float delta) {
            if (!this.visible) return;

            boolean hovered = this.isSelected() || this.isHovered();
            
            int x = this.getX();
            int y = this.getY();
            int w = this.width;
            int h = this.height;

            // Draw horizontal gradient from Purple to Dark Purple/Black
            for (int i = 0; i < w; i++) {
                float ratio = (float) i / w;
                int rStart = hovered ? 120 : 100;
                int gStart = hovered ? 35 : 25;
                int bStart = hovered ? 170 : 150;
                
                int rEnd = 20;
                int gEnd = 5;
                int bEnd = 35;

                int r = (int) (rStart + (rEnd - rStart) * ratio);
                int g = (int) (gStart + (gEnd - gStart) * ratio);
                int b = (int) (bStart + (bEnd - bStart) * ratio);
                int color = 0xFF000000 | (r << 16) | (g << 8) | b;
                context.fill(x + i, y, x + i + 1, y + h, color);
            }

            // Draw border
            int borderColor = hovered ? 0xFFC084FC : 0xFF701E9E;
            context.drawBorder(x, y, w, h, borderColor);

            // Draw logo icon inside the card
            int logoSize = h - 14;
            int logoX = x + 10;
            int logoY = y + 7;
            context.drawTexture(
                RenderPipelines.GUI_TEXTURED,
                LOGO_TEXTURE,
                logoX, logoY,
                0f, 0f,
                logoSize, logoSize,
                logoSize, logoSize
            );

            // Draw text labels
            int textColor = hovered ? 0xFFFFFFFF : 0xFFE9D5FF;
            context.drawTextWithShadow(
                net.minecraft.client.MinecraftClient.getInstance().textRenderer,
                "MARINMC",
                logoX + logoSize + 8,
                y + 9,
                textColor
            );
            context.drawTextWithShadow(
                net.minecraft.client.MinecraftClient.getInstance().textRenderer,
                "CLIENT OPT",
                logoX + logoSize + 8,
                y + 19,
                0x80FFFFFF
            );
        }
    }
}
