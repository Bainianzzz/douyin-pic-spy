import { installFetchHook } from './capture/fetch-hook';
import { absorbScripts, installRouterDataHook } from './capture/router-data';
import { installXhrHook } from './capture/xhr-hook';
import { buildUI } from './ui/panel';

function boot(): void {
  if (document.body) {
    buildUI();
    absorbScripts();
  } else {
    setTimeout(boot, 300);
  }
}

// Capture hooks must be live before the page issues its first requests.
installRouterDataHook();
installXhrHook();
installFetchHook();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
