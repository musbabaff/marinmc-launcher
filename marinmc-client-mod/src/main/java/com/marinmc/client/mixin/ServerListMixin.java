package com.marinmc.client.mixin;

import net.minecraft.client.network.ServerInfo;
import net.minecraft.client.option.ServerList;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.List;

@Mixin(ServerList.class)
public class ServerListMixin {
    @Shadow
    @Final
    private List<ServerInfo> servers;

    @Inject(method = "loadFile", at = @At("TAIL"))
    private void onLoadFile(CallbackInfo ci) {
        ensureMarinMcAtTop();
    }

    @Inject(method = "saveFile", at = @At("HEAD"))
    private void onSaveFile(CallbackInfo ci) {
        ensureMarinMcAtTop();
    }

    @Inject(method = "remove", at = @At("HEAD"), cancellable = true)
    private void onRemove(ServerInfo serverInfo, CallbackInfo ci) {
        if (serverInfo != null && serverInfo.address != null && serverInfo.address.toLowerCase().contains("marinmc.com")) {
            ci.cancel();
        }
    }

    @Inject(method = "swapEntries", at = @At("HEAD"), cancellable = true)
    private void onSwapEntries(int index1, int index2, CallbackInfo ci) {
        if (index1 == 0 || index2 == 0) {
            if (isMarinMcAtIndex(0)) {
                ci.cancel();
            }
        }
    }

    private boolean isMarinMcAtIndex(int index) {
        if (index >= 0 && index < servers.size()) {
            ServerInfo info = servers.get(index);
            return info != null && info.address != null && info.address.toLowerCase().contains("marinmc.com");
        }
        return false;
    }

    private void ensureMarinMcAtTop() {
        ServerInfo marinServer = null;
        for (int i = 0; i < servers.size(); i++) {
            ServerInfo info = servers.get(i);
            if (info != null && info.address != null && info.address.toLowerCase().contains("marinmc.com")) {
                marinServer = info;
                servers.remove(i);
                break;
            }
        }

        if (marinServer == null) {
            marinServer = new ServerInfo("§6§l★ MarinMC Network §r§7[1.21.x]", "oyna.marinmc.com", ServerInfo.ServerType.OTHER);
        } else {
            marinServer.name = "§6§l★ MarinMC §r§7[1.21.x]";
        }

        servers.add(0, marinServer);
    }
}
