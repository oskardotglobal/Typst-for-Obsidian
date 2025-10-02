import typstInit, * as typst from "../pkg";

import {
  CompileImageCommand,
  CompileSvgCommand,
  CompilePdfCommand,
  Message,
} from "src/types";

let canUseSharedArrayBuffer = false;

let decoder = new TextDecoder();
let basePath: string;
let packagePath: string;
let packages: string[] = [];
const xhr = new XMLHttpRequest();

function requestData(path: string): string {
  try {
    if (!canUseSharedArrayBuffer) {
      if (path.startsWith("@")) {
        if (packages.includes(path.slice(1))) {
          return packagePath + path.slice(1);
        }
        throw 2;
      }
      path = "http://localhost/_capacitor_file_" + basePath + "/" + path;
      xhr.open("GET", path, false);
      try {
        xhr.send();
      } catch (e) {
        console.error(e);
        throw 3;
      }
      if (xhr.status == 404) {
        throw 2;
      }
      return xhr.responseText;
    }
    // prettier-ignore
    // @ts-ignore
    let buffer = new Int32Array(new SharedArrayBuffer(4, { maxByteLength: 1e8 }));
    buffer[0] = 0;
    postMessage({ buffer, path });
    const res = Atomics.wait(buffer, 0, 0);
    if (buffer[0] == 0) {
      return decoder.decode(Uint8Array.from(buffer.slice(1)));
    }
    throw buffer[0];
  } catch (e) {
    if (typeof e != "number") {
      console.error(e);
      throw 1;
    }
    throw e;
  }
}

let compiler: typst.Compiler;

onmessage = (ev: MessageEvent<Message>) => {
  console.log("🟣 Worker: Received message:", ev.data.type);
  const message = ev.data;
  switch (message.type) {
    case "canUseSharedArrayBuffer":
      console.log(
        "🟣 Worker: Setting canUseSharedArrayBuffer to:",
        message.data
      );
      canUseSharedArrayBuffer = message.data;
      break;
    case "startup":
      console.log("🟣 Worker: Starting typst initialization");
      typstInit(message.data.wasm)
        .then((_) => {
          console.log("🟣 Worker: typst initialized, creating compiler");
          compiler = new typst.Compiler("", requestData);
          console.log("Typst web assembly loaded!");
          // Send ready signal
          console.log("🟣 Worker: Sending ready signal");
          postMessage({ type: "ready" });
        })
        .catch((error) => {
          console.error("🔴 Worker: typst initialization failed:", error);
          postMessage({ type: "error", error: error.toString() });
        });
      basePath = message.data.basePath;
      packagePath = message.data.packagePath;
      console.log(
        "🟣 Worker: Set basePath:",
        basePath,
        "packagePath:",
        packagePath
      );
      break;
    case "fonts":
      console.log("🟣 Worker: Adding fonts, count:", message.data.length);
      if (!compiler) {
        console.warn(
          "🟡 Worker: Compiler not initialized yet, cannot add fonts"
        );
        break;
      }
      message.data.forEach((font: any) =>
        compiler.add_font(new Uint8Array(font))
      );
      break;
    case "compile":
      console.log("🟣 Worker: Compile request, format:", message.data.format);
      if (!compiler) {
        console.error("🔴 Worker: Compiler not initialized!");
        postMessage({ error: "Compiler not initialized" });
        return;
      }
      try {
        if (message.data.format == "image") {
          console.log("🟣 Worker: Compiling to image");
          const data: CompileImageCommand = message.data;
          const result = compiler.compile_image(
            data.source,
            data.path,
            data.pixel_per_pt,
            data.fill,
            data.size,
            data.display
          );
          console.log("🟣 Worker: Image compilation complete, posting result");
          postMessage(result);
        } else if (message.data.format == "svg") {
          console.log("🟣 Worker: Compiling to SVG");
          const result = compiler.compile_svg(
            message.data.source,
            message.data.path
          );
          console.log("🟣 Worker: SVG compilation complete, posting result");
          postMessage(result);
        } else if (message.data.format == "pdf") {
          console.log("🟣 Worker: Compiling to PDF");
          const data: CompilePdfCommand = message.data;
          const result = compiler.compile_pdf(data.source, data.path);
          console.log("🟣 Worker: PDF compilation complete, posting result");
          postMessage(result);
        }
      } catch (error) {
        console.error("🔴 Worker: Compilation failed:", error);
        postMessage({ error: error.toString() });
      }
      break;
    case "packages":
      console.log("🟣 Worker: Setting packages, count:", message.data.length);
      packages = message.data;
      break;
    default:
      console.error("🔴 Worker: Unknown message type:", message);
      throw message;
  }
};

console.log("Typst compiler worker loaded!");
