package com.marinmc.client.mixin;

import net.minecraft.client.option.SimpleOption;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Accessor for SimpleOption's internal value field, letting us set gamma above
 * the normal 0..1 clamp for a real Fullbright effect (setValue() would clamp it).
 */
@Mixin(SimpleOption.class)
public interface SimpleOptionAccessor {
    @Accessor("value")
    void marinmc$setValueDirect(Object value);

    @Accessor("value")
    Object marinmc$getValueDirect();
}
