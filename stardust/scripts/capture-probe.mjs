// capture-probe.mjs <url> — run the gate's own capture() on one URL and list the tall body descendants (why does the gate see a taller page than an ad-hoc probe?)
import { chromium } from 'playwright'; import { capture } from './fidelity-core.mjs';
const b = await chromium.launch();
const url = process.argv[2];
// monkey-patch: capture returns inventory + shot; we also want the DOM tail, so re-run the same steps with an extra evaluate
const res = await capture(b, url, 1440, false);
console.log('gate height', res.height, 'shot', res.shot.height, 'texts', res.texts.length);
const tail = res.texts.filter((t) => t.box[1] > res.height - 900).slice(-12).map((t) => `${t.region} <${t.tag}> @${t.box[1]} h${t.box[3]} "${t.key.slice(0, 40)}"`);
console.log(tail.join('\n'));
await b.close();
