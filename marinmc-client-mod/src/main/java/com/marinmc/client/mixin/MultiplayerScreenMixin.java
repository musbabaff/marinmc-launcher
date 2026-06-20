package com.marinmc.client.mixin;

import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.client.option.ServerList;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(MultiplayerScreen.class)
public class MultiplayerScreenMixin extends Screen {

    protected MultiplayerScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        if (this.client != null) {
            ServerList serverList = new ServerList(this.client);
            serverList.loadFile();
            
            boolean found = false;
            for (int i = 0; i < serverList.size(); i++) {
                ServerInfo info = serverList.get(i);
                if (info.address != null && info.address.toLowerCase().contains("marinmc.com")) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                ServerInfo marinServer = new ServerInfo("MarinMC Network", "oyna.marinmc.com", ServerInfo.ServerType.OTHER);
                serverList.add(marinServer, false);
                serverList.saveFile();
            }
        }
    }
}
