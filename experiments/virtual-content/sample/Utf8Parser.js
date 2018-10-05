export class Utf8Parser {
  constructor(callback) {
    this._callback = callback;
    this._buffer = new Uint8Array(2 ** 20); // 1MiB
    this._bufferLength = 0;
  }

  push(bytes) {
    const buffer = this._buffer;
    buffer.set(bytes, this._bufferLength);
    this._bufferLength += bytes.length;

    let str = "";
    let i;
    for (i = 0; i < this._bufferLength; i++) {
      let byte = buffer[i];
      let codePoint = 0;
      if ((byte & 0b10000000) === 0) {
        codePoint += byte;
      } else if ((byte & 0b11000000) === 0b10000000) {
        throw new Error("Unexpected continuation byte.");
      } else if ((byte & 0b11100000) === 0b11000000) {
        const remaining = this._bufferLength - i;
        if (remaining < 1) {
          i--;
          break;
        }
        codePoint += byte & 0b00011111;
        codePoint <<= 6;
        codePoint += buffer[++i] & 0b00111111;
      } else if ((byte & 0b11110000) === 0b11100000) {
        const remaining = this._bufferLength - i;
        if (remaining < 2) {
          i--;
          break;
        }
        codePoint += byte & 0b00001111;
        codePoint <<= 6;
        codePoint += buffer[++i] & 0b00111111;
        codePoint <<= 6;
        codePoint += buffer[++i] & 0b00111111;
      } else if ((byte & 0b11111000) === 0b11110000) {
        const remaining = this._bufferLength - i;
        if (remaining < 3) {
          i--;
          break;
        }
        codePoint += byte & 0b00000111;
        codePoint <<= 6;
        codePoint += buffer[++i] & 0b00111111;
        codePoint <<= 6;
        codePoint += buffer[++i] & 0b00111111;
        codePoint <<= 6;
        codePoint += buffer[++i] & 0b00111111;
      }
      str += String.fromCodePoint(codePoint);
    }

    buffer.copyWithin(0, i);
    this._bufferLength -= i;

    this._callback.call(undefined, str);
  }
};
