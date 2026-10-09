export const CSS = `
#dy-img-dl-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;
  display:flex;flex-direction:column;align-items:flex-end;gap:8px;
  font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#111}
#dy-img-dl-panel *{box-sizing:border-box}
#dy-img-dl-pill{display:flex;align-items:stretch;background:#fe2c55;border-radius:24px;
  overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.25)}
#dy-img-dl-btn{display:flex;align-items:center;gap:6px;background:transparent;color:#fff;
  border:none;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600}
#dy-img-dl-btn:hover{background:rgba(255,255,255,.14)}
#dy-img-dl-gear{display:flex;align-items:center;justify-content:center;width:46px;
  background:transparent;color:#fff;border:none;
  border-left:1px solid rgba(255,255,255,.35);cursor:pointer;padding:0}
#dy-img-dl-pill svg{display:block;width:18px;height:18px}
#dy-img-dl-gear svg{width:18px;height:18px}
#dy-img-dl-gear:hover{background:rgba(255,255,255,.14)}
#dy-img-dl-gear.active{background:rgba(0,0,0,.2)}
#dy-img-dl-toast{display:none;max-width:300px;background:rgba(20,20,20,.92);color:#fff;
  font-size:12px;padding:8px 12px;border-radius:10px;white-space:pre-wrap;
  box-shadow:0 6px 18px rgba(0,0,0,.25)}
#dy-img-dl-toast.show{display:block}
#dy-img-dl-toast[data-kind="warn"]{background:rgba(170,34,34,.95)}
#dy-img-dl-toast .sub{color:rgba(255,255,255,.55);font-size:11px;margin-top:2px}
#dy-img-dl-box{background:#fff;border-radius:12px;padding:10px 12px;
  box-shadow:0 6px 18px rgba(0,0,0,.25);width:270px;display:none}
#dy-img-dl-box.open{display:block}
#dy-img-dl-box .row{display:flex;align-items:center;justify-content:space-between;margin:6px 0;gap:8px}
#dy-img-dl-box select{border:1px solid #ddd;border-radius:6px;padding:3px 6px;font-size:12px;max-width:150px}
#dy-img-dl-box button.mini{border:1px solid #ddd;background:#f7f7f7;border-radius:6px;
  padding:4px 8px;font-size:12px;cursor:pointer}
#dy-img-dl-box button.mini:hover{background:#eee}
#dy-img-dl-pick{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
