package com.marinmc.client.mixin;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.redlance.dima_dencep.mods.online_emotes.network.OnlineNetworkInstance;
import java.net.URI;

@Mixin(value = OnlineNetworkInstance.class, remap = false)
public class OnlineNetworkInstanceMixin {

    @Redirect(
        method = "connectInternal",
        at = @At(value = "FIELD", target = "Lorg/redlance/dima_dencep/mods/online_emotes/network/OnlineNetworkInstance;URI_ADDRESS:Ljava/net/URI;")
    )
    private URI redirectUriAddress() {
        return com.marinmc.client.cosmetics.CosmeticProfile.getEmoteWebSocketUri();
    }
}
