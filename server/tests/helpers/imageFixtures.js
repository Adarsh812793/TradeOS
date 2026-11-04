//Builds small, genuinely valid image files for the upload tests (no binary files kept in the repo).
import zlib from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

//One PNG chunk: 4-byte length + 4-byte type + data + 4-byte CRC
const pngChunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);

    const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(typeAndData) >>> 0);

    return Buffer.concat([length, typeAndData, crc]);
};

//A solid-colour PNG of the given size, e.g. makePng(300, 200, [200, 30, 30])
export const makePng = (width = 64, height = 64, [red, green, blue] = [34, 139, 34]) => {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; //bit depth
    header[9] = 2; //colour type: RGB

    //Each row starts with a filter byte (0 = none) followed by the pixels
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
        row[1 + x * 3] = red;
        row[2 + x * 3] = green;
        row[3 + x * 3] = blue;
    }

    const pixels = Buffer.concat(Array.from({ length: height }, () => row));

    return Buffer.concat([
        PNG_SIGNATURE,
        pngChunk("IHDR", header),
        pngChunk("IDAT", zlib.deflateSync(pixels)),
        pngChunk("IEND", Buffer.alloc(0))
    ]);
};

//Reads the size back out of a PNG: { width, height }
export const readPngSize = (buffer) => ({
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
});
