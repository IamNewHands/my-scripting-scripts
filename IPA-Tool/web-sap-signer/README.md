# Web SAP Signer

这是浏览器版 SAP 签名运行目录。宿主代码和 Web 静态资源分开存放：

```text
index.tsx
sapSignCache.ts
server.ts
SAPProxy.ts
runtime/
  index.html
  sap-signer.js
  sap.wasm
  unicorn_x86.js
  wasm_exec.js
```

## 使用

Web 层只接收 `bodyBase64` 和初始化时的 `guid`。XML 或二进制 body 的转换在
Scripting 宿主层完成，保证签名和实际 HTTP 请求使用完全相同的字节。

先加载脚本，再创建一个签名会话：

```html
<script src="./sap-signer.js"></script>
<script>
  async function signBodies(guid, bodyBase64List, proxyURL) {
    await sapInitialize(guid, { proxyURL });
    try {
      const signatures = [];
      for (const bodyBase64 of bodyBase64List) {
        signatures.push(await sapSign(bodyBase64));
      }
      return signatures;
    } finally {
      await sapClose();
    }
  }
</script>
```

`guid` 会保存为 `SapSigner` 实例属性；重复调用 `sapSign()` 会复用同一套已
初始化的上下文，只有 `sapClose()` 才会销毁它。调用结果是 SAP 签名的标准
Base64 字符串：

```js
const [signatureBase64] = await signBodies(guid, [bodyBase64], proxyURL);
```

不需要传入 `sap.wasm`、`unicorn_x86.js` 或 `wasm_exec.js` 的路径。它们和
`sap-signer.js` 位于同一个 `runtime/` 目录，脚本会自动加载。

## 输入要求

- 初始化时传入的 `guid` 必须和 HTTP 请求使用的设备标识一致；
- `bodyBase64` 必须是完整请求 body 的原始字节 Base64；
- 不要在发送到服务端前 trim、重新序列化或修改换行符；
- 服务端实际提交的 body 必须与编码成 `bodyBase64` 的字节完全一致。

签名返回后，将它放入服务端请求头：

```http
X-Apple-ActionSignature: <signatureBase64>
```

## 代理要求

代理需要转发以下两个 Apple 请求：

```text
GET  https://s.mzstatic.com/sap/setupCert.plist
POST https://fpinit.itunes.apple.com/v1/signSapSetup/legacy
```

setup 的 POST 使用 `Content-Type: application/x-plist`，因此代理必须处理 CORS
OPTIONS 预检，并给预检和实际响应返回 CORS 头。证书响应和 setup 响应都应按
原始字节返回。

项目根目录的 `proxy.mjs` 是一个不需要 npm 依赖的 Node.js 代理示例：

```shell
node proxy.mjs
```

生产环境建议使用 HTTPS 页面和 HTTPS 代理，避免 HTTPS 页面调用 HTTP 代理时被
浏览器按 mixed content 拦截。

## Scripting 宿主层

宿主层的缓存开关属于签名会话初始化配置，而不是单次 `sign()` 参数：

```ts
const signer = initializeSapSigner(guid, { useCache: true })
try {
  const signature1 = await signer.sign(body1)
  const signature2 = await signer.sign(body2)
} finally {
  await signer.close()
}
```

`initializeSapSigner()` 本身是同步的，只保存 `guid` 和缓存策略；第一次缓存未
命中的 `sign()` 才会真正创建 WebView、启动代理并初始化 WASM。

项目通过 `initializeSapSigner(guid, { useCache })` 获取对应配置的持久化会话；
不调用 `closeSapSigner()` 就不会销毁该会话。

如果只需要偶发签名，也可以继续使用旧的单次入口：

```ts
const signature = await signSap(body, useCache)
```

该入口每次都会独立初始化和关闭，不会长期占用 WebView；需要连续签名时应使用
`initializeSapSigner()`。
