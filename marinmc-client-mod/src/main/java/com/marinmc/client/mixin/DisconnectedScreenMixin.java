package com.marinmc.client.mixin;

import net.minecraft.client.gui.screen.DisconnectedScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(DisconnectedScreen.class)
public class DisconnectedScreenMixin extends Screen {
    @Shadow @Final private Screen parent;

    private ButtonWidget reconnectButton;
    private int countdown = 100; // 5 seconds (20 ticks = 1 second)
    private boolean cancelled = false;

    protected DisconnectedScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        cancelled = false;
        countdown = 100;

        reconnectButton = ButtonWidget.builder(
            Text.literal("Bağlanılıyor... (5s) [İptal]"),
            button -> {
                cancelled = true;
                button.setMessage(Text.literal("Otomatik Bağlantı İptal Edildi"));
                button.active = false;
            }
        ).dimensions(this.width / 2 - 100, this.height - 30, 200, 20).build();

        this.addDrawableChild(reconnectButton);
    }

    @Override
    public void tick() {
        super.tick();
        if (reconnectButton != null && !cancelled && reconnectButton.active) {
            countdown--;
            int seconds = (countdown + 19) / 20;
            reconnectButton.setMessage(Text.literal("Yeniden Bağlanılıyor... (" + seconds + "s) [İptal]"));

            if (countdown <= 0) {
                reconnectButton.active = false;
                reconnect();
            }
        }
    }

    private void reconnect() {
        if (this.client != null) {
            ServerInfo serverInfo = new ServerInfo("MarinMC", "oyna.marinmc.com", ServerInfo.ServerType.OTHER);
            ConnectScreen.connect(
                this.parent, 
                this.client, 
                ServerAddress.parse("oyna.marinmc.com"), 
                serverInfo, 
                false, 
                null
            );
        }
    }
}
