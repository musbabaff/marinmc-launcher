const fs = require('fs');
const path = require('path');

const manifest = {
  version: "1.21.8",
  mods: [
    {
      name: "Fabric API",
      filename: "fabric-api-0.100.0+1.21.8.jar",
      url: "https://cdn.marinmc.com/mods/fabric-api-0.100.0+1.21.8.jar",
      md5: "a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8"
    },
    {
      name: "Sodium",
      filename: "sodium-fabric-0.6.0+1.21.8.jar",
      url: "https://cdn.marinmc.com/mods/sodium-fabric-0.6.0+1.21.8.jar",
      md5: "b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9"
    },
    {
      name: "Iris Shaders",
      filename: "iris-1.8.0+1.21.8.jar",
      url: "https://cdn.marinmc.com/mods/iris-1.8.0+1.21.8.jar",
      md5: "c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0"
    },
    {
      name: "Lithium",
      filename: "lithium-fabric-0.12.0+1.21.8.jar",
      url: "https://cdn.marinmc.com/mods/lithium-fabric-0.12.0+1.21.8.jar",
      md5: "d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1"
    },
    {
      name: "Reese's Sodium Options",
      filename: "reeses-sodium-options-1.7.2+1.21.8.jar",
      url: "https://cdn.marinmc.com/mods/reeses-sodium-options-1.7.2+1.21.8.jar",
      md5: "e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2"
    },
    {
      name: "Sodium Extra",
      filename: "sodium-extra-0.5.4+1.21.8.jar",
      url: "https://cdn.marinmc.com/mods/sodium-extra-0.5.4+1.21.8.jar",
      md5: "f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3"
    },
    {
      name: "MarinMC Client Mod",
      filename: "marinmc-client-mod-1.0.0.jar",
      url: "https://cdn.marinmc.com/mods/marinmc-client-mod-1.0.0.jar",
      md5: "e86e80391af4b0adc228d0cff7908aa1"
    }
  ]
};

const dest = path.join(__dirname, '..', 'assets', 'manifest.json');
fs.writeFileSync(dest, JSON.stringify(manifest, null, 2), 'utf8');
console.log('manifest.json generated successfully at', dest);
