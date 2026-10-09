export const BATCH_CSS = `
.dy-batch-card{position:relative}
.dy-batch-mask{position:absolute;inset:0;background:rgba(128,128,128,.6);
  pointer-events:none;z-index:5;display:none}
.dy-batch-circle{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;
  border:2px solid #fff;background:rgba(0,0,0,.25);z-index:6;pointer-events:none;
  display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.dy-batch-circle svg{width:14px;height:14px;display:none}
.dy-batch-card.selected .dy-batch-circle{background:#fe2c55;border-color:#fe2c55}
.dy-batch-card.selected .dy-batch-circle svg{display:block}
.dy-batch-card.disabled .dy-batch-mask{display:block}
.dy-batch-card.disabled .dy-batch-circle{display:none}
#dy-batch-bar{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;
  display:flex;align-items:center;gap:12px;background:#111;color:#fff;padding:10px 16px;
  border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35);
  font:13px/1.4 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
#dy-batch-bar .count{white-space:nowrap}
#dy-batch-bar button{border:none;border-radius:999px;padding:8px 16px;cursor:pointer;
  font-size:13px;font-weight:600}
#dy-batch-start{background:#fe2c55;color:#fff}
#dy-batch-start:disabled{background:#555;color:#aaa;cursor:not-allowed}
#dy-batch-cancel{background:transparent;color:#bbb}
#dy-batch-cancel:hover{color:#fff}
`;
