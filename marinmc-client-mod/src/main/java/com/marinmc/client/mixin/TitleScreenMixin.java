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
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TitleScreen.class)
public class TitleScreenMixin extends Screen {

    protected TitleScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        // Clear all default Minecraft buttons
        this.clearChildren();

        int cardWidth = 240;
        int cardY = this.height / 2 - 95;
        int btnW = 200;
        int btnH = 20;
        int btnX = this.width / 2 - btnW / 2;

        // Button 1: Tek Oyunculu (Singleplayer)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("Tek Oyunculu"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new SelectWorldScreen(this));
                }
            }
        ).dimensions(btnX, cardY + 15, btnW, btnH).build());

        // Button 2: Çok Oyunculu (Multiplayer)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("Çok Oyunculu"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new MultiplayerScreen(this));
                }
            }
        ).dimensions(btnX, cardY + 43, btnW, btnH).build());

        // Button 3: Hızlı Giriş (Quick Play to oyna.marinmc.com)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("§bHızlı Giriş (MarinMC)"),
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
        ).dimensions(btnX, cardY + 71, btnW, btnH).build());

        // Button 4: Client Ayarları (Overlay settings)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("§dMarinMC Ayarları"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OverlayScreen());
                }
            }
        ).dimensions(btnX, cardY + 99, btnW, btnH).build());

        // Button 5: Ayarlar (Options)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("Ayarlar"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OptionsScreen(this, this.client.options));
                }
            }
        ).dimensions(btnX, cardY + 127, btnW, btnH).build());

        // Button 6: Oyundan Çık (Quit)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("Oyundan Çık"),
            button -> {
                if (this.client != null) {
                    this.client.scheduleStop();
                }
            }
        ).dimensions(btnX, cardY + 155, btnW, btnH).build());
    }

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void onRender(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        // Draw custom premium radial-style background gradient (dark purple/black theme)
        context.fillGradient(0, 0, this.width, this.height, 0xFF140E1B, 0xFF050306);

        // Draw centered panel card behind buttons
        int cardWidth = 240;
        int cardHeight = 195;
        int cardX = this.width / 2 - cardWidth / 2;
        int cardY = this.height / 2 - 95;

        // Draw card background with a nice blue outline border
        context.fill(cardX, cardY, cardX + cardWidth, cardY + cardHeight, 0xCE0A070E);
        context.drawBorder(cardX, cardY, cardWidth, cardHeight, 0xFF2D7DD2);

        // Draw big title text (Styled client name)
        String titleText = "§lMARINMC CLIENT";
        context.drawCenteredTextWithShadow(this.textRenderer, titleText, this.width / 2, cardY - 35, 0xFF2D7DD2);

        // Draw version/description text
        String subTitleText = "v1.21.8 - Premium PvP Edition";
        context.drawCenteredTextWithShadow(this.textRenderer, subTitleText, this.width / 2, cardY - 20, 0xFFA1A1AA);

        // Render widgets (buttons)
        super.render(context, mouseX, mouseY, delta);

        // Draw bottom left branding
        String footerLeft = "MarinMC Oyuncu Topluluğu © 2026";
        context.drawTextWithShadow(this.textRenderer, footerLeft, 10, this.height - 22, 0xFFA1A1AA);

        // Draw bottom right server IP
        String footerRight = "oyna.marinmc.com";
        context.drawTextWithShadow(this.textRenderer, footerRight, this.width - this.textRenderer.getWidth(footerRight) - 10, this.height - 22, 0xFF2D7DD2);

        ci.cancel();
    }
}
