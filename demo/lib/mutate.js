let pool = [];
const mutations = [add, remove, changeId];

function mutate(freq) {
    const mut = mutations[Math.floor(Math.random() * (mutations.length - 1))];
    if (mut) {
        // console.log(mut);
        mut();
    }
    update();
    setTimeout(() => window.requestAnimationFrame(() => mutate(freq)), freq);
}

function add() {
    const idx = Math.round(Math.random() * window.items.length);
    const num = Math.round(Math.random() * 10);
    const toAdd = pool.splice(0, num);
    const origLen = window.items.length;
    window.items = [...window.items.slice(0, idx), ...toAdd, ...window.items.slice(idx)];
    console.log('add', origLen, toAdd.length, window.items.length);
}

function remove() {
    const idx = Math.round(Math.random() * window.items.length);
    const num = Math.round(Math.random() * 10);
    const rem = window.items.splice(idx, num);
    const origLen = window.items.length;
    pool = [...pool, ...rem];
    window.items = window.items.slice();
    console.log('remove', origLen, rem.length, window.items.length);
}

function changeId() {
    const idx = Math.round(Math.random() * window.items.length);
    const rand = Math.round(Math.random() * window.items.length);
    window.items = window.items.slice();
    window.items[idx] = Object.assign({}, window.items[idx], {index: rand});
}

window.update = update;
window.add = add;
window.remove = remove;
window.mutate = mutate;
