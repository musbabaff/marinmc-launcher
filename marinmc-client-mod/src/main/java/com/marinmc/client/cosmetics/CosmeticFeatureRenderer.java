package com.marinmc.client.cosmetics;

import net.minecraft.client.render.OverlayTexture;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.entity.feature.FeatureRenderer;
import net.minecraft.client.render.entity.feature.FeatureRendererContext;
import net.minecraft.client.render.entity.model.PlayerEntityModel;
import net.minecraft.client.render.entity.state.PlayerEntityRenderState;
import net.minecraft.client.util.math.MatrixStack;

public class CosmeticFeatureRenderer extends FeatureRenderer<PlayerEntityRenderState, PlayerEntityModel> {

    public CosmeticFeatureRenderer(FeatureRendererContext<PlayerEntityRenderState, PlayerEntityModel> context) {
        super(context);
    }

    @Override
    public void render(MatrixStack matrices, VertexConsumerProvider vertexConsumers, int light, PlayerEntityRenderState state, float limbAngle, float limbDistance) {
        if (state.name == null || state.name.trim().isEmpty()) {
            return;
        }

        CosmeticProfile profile = CosmeticProfile.getProfile(state.name);
        if (profile == null) {
            return;
        }

        PlayerEntityModel playerModel = this.getContextModel();

        // 1. Render Hat
        String hatName = profile.getHatName();
        if (hatName != null && !hatName.trim().isEmpty()) {
            CosmeticModel model = CosmeticModel.getModel(hatName);
            if (model != null) {
                matrices.push();
                playerModel.head.applyTransform(matrices);
                model.render(matrices, vertexConsumers, light, OverlayTexture.DEFAULT_UV, "hat", state.age);
                matrices.pop();
            }
        }

        // 2. Render Wings
        String wingsName = profile.getWingsName();
        if (wingsName != null && !wingsName.trim().isEmpty()) {
            CosmeticModel model = CosmeticModel.getModel(wingsName);
            if (model != null) {
                matrices.push();
                playerModel.body.applyTransform(matrices);
                // Offset slightly behind the body to prevent clipping
                matrices.translate(0.0f, 0.0f, 0.125f);
                model.render(matrices, vertexConsumers, light, OverlayTexture.DEFAULT_UV, "wings", state.age);
                matrices.pop();
            }
        }

        // 3. Render Staff / Handheld
        String staffName = profile.getStaffName();
        if (staffName != null && !staffName.trim().isEmpty()) {
            CosmeticModel model = CosmeticModel.getModel(staffName);
            if (model != null) {
                matrices.push();
                playerModel.rightArm.applyTransform(matrices);
                model.render(matrices, vertexConsumers, light, OverlayTexture.DEFAULT_UV, "staff", state.age);
                matrices.pop();
            }
        }

        // 4. Render Pet
        String petName = profile.getPetName();
        if (petName != null && !petName.trim().isEmpty()) {
            CosmeticModel model = CosmeticModel.getModel(petName);
            if (model != null) {
                matrices.push();
                playerModel.body.applyTransform(matrices);
                // Offset pet to float beside the player
                matrices.translate(0.75f, -0.5f, 0.0f);
                model.render(matrices, vertexConsumers, light, OverlayTexture.DEFAULT_UV, "pet", state.age);
                matrices.pop();
            }
        }
    }
}
