import net from 'net';

// Minecraft Java "Server List Ping" client. Returns real player counts from a
// running server, or { online: false } if it can't be reached. No fabricated data.

function writeVarInt(value) {
  const bytes = [];
  let v = value >>> 0; // treat as unsigned 32-bit
  do {
    let temp = v & 0x7f;
    v >>>= 7;
    if (v !== 0) temp |= 0x80;
    bytes.push(temp);
  } while (v !== 0);
  return Buffer.from(bytes);
}

// Read a VarInt from buf starting at offset. Returns { value, size } or null if
// not enough bytes are available yet.
function readVarInt(buf, offset) {
  let value = 0;
  let size = 0;
  let byte;
  do {
    if (offset + size >= buf.length) return null;
    byte = buf[offset + size];
    value |= (byte & 0x7f) << (7 * size);
    size++;
    if (size > 5) return null;
  } while (byte & 0x80);
  return { value: value >>> 0, size };
}

function encodePacket(packetId, data) {
  const body = Buffer.concat([writeVarInt(packetId), data]);
  return Buffer.concat([writeVarInt(body.length), body]);
}

/**
 * Ping a Minecraft Java server.
 * @returns Promise<{ online, players?: {online,max}, version?, ping? }>
 */
export function pingMinecraft(host, port = 25565, timeout = 3000) {
  return new Promise((resolve) => {
    let resolved = false;
    const start = Date.now();
    const socket = net.createConnection({ host, port });
    let chunks = Buffer.alloc(0);

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      try { socket.destroy(); } catch {}
      resolve(result);
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => finish({ online: false }));
    socket.on('error', () => finish({ online: false }));

    socket.on('connect', () => {
      // Handshake: protocol version (varint), server address (string), port (u16), next state = 1 (status)
      const hostBuf = Buffer.from(host, 'utf8');
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port, 0);
      const handshakeData = Buffer.concat([
        writeVarInt(767),               // protocol version (any recent value works for status)
        writeVarInt(hostBuf.length),
        hostBuf,
        portBuf,
        writeVarInt(1)                  // next state: status
      ]);
      socket.write(encodePacket(0x00, handshakeData));
      // Status request (empty)
      socket.write(encodePacket(0x00, Buffer.alloc(0)));
    });

    socket.on('data', (data) => {
      chunks = Buffer.concat([chunks, data]);

      // Parse: [packet length VarInt][packet id VarInt][json length VarInt][json...]
      const lenField = readVarInt(chunks, 0);
      if (!lenField) return; // wait for more
      const packetLen = lenField.value;
      const totalNeeded = lenField.size + packetLen;
      if (chunks.length < totalNeeded) return; // wait for full packet

      let pos = lenField.size;
      const idField = readVarInt(chunks, pos);
      if (!idField) return finish({ online: false });
      pos += idField.size;

      const strLen = readVarInt(chunks, pos);
      if (!strLen) return finish({ online: false });
      pos += strLen.size;

      const jsonBuf = chunks.subarray(pos, pos + strLen.value);
      try {
        const status = JSON.parse(jsonBuf.toString('utf8'));
        finish({
          online: true,
          players: {
            online: status.players?.online ?? 0,
            max: status.players?.max ?? 0
          },
          version: status.version?.name || null,
          ping: Date.now() - start
        });
      } catch {
        finish({ online: false });
      }
    });
  });
}
