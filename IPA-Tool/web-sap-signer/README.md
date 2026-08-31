# Web SAP Signer

这是浏览器版 SAP 签名运行目录。四个文件需要一起部署：

```text
sap-signer.js
sap.wasm
unicorn_x86.js
wasm_exec.js
```

## 使用

先加载脚本，再传入完整 XML 字符串。代理地址是业务侧需要提供的配置：

```html
<script src="./sap-signer.js"></script>
<script>
  async function signXml(xmlString) {
    return await sapSign(xmlString);
  }
</script>
```

调用结果是 SAP 签名的标准 Base64 字符串：

```js
const signatureBase64 = await signXml(xmlString);
```

也可以直接调用：

```js
const signatureBase64 = await sapSign(xmlString);
```

不需要传入 `sap.wasm`、`unicorn_x86.js` 或 `wasm_exec.js` 的路径。脚本会自动从
`sap-signer.js` 所在目录加载它们。

## 输入要求

- `xmlString` 必须是完整的 XML plist 字符串；
- XML 中必须包含十六进制格式的 `guid`；
- 签名针对 XML 的原始 UTF-8 字节；
- 不要在发送到服务端前 trim、重新序列化或修改换行符；
- 服务端实际提交的 body 必须与签名时使用的 XML 字节完全一致。

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
