// @vitest-environment happy-dom
import { beforeEach, expect, test, vi } from "vitest";
import {
  calculateFoldersDropAreas, createDropPreview, createTabDummy,
  getItemIdByIndex, getSelectedTargetRoots, getIdsFromElements,
  getNewPlacementForItem, getOverlappedDropArea,
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { processItemDragAndDrop } from "@/newtab/04-features/dragging/model/processItemDragAndDrop";
import { processFolderDragAndDrop } from "@/newtab/04-features/dragging/model/processFolderDragAndDrop";
import { handleBookmarksKeyDown, handleSearchKeyDown } from "@/newtab/04-features/bookmarks/model/handleBookmarksKeyDown";

beforeEach(() => { document.body.innerHTML = ""; });
const bookmark = (id: number) => `<div><a href="https://example.com" tabindex="0" data-role="folder-item" data-id="${id}">${id}</a></div>`;
const group = (fragment: number, id: number) => `<div data-role="folder-group" data-group-id="100" data-group-fragment="${fragment}"><div data-role="group-header" data-id="100" data-group-id="100" data-folder-id="10" data-drop-insert="end">Group</div><div data-role="group-items" data-group-id="100" data-folder-id="10">${bookmark(id)}</div></div>`;
function columns() {
  document.body.innerHTML = `<div data-role="folder" data-folder-id="10"><div data-role="folder-items" data-folder-id="10" data-column-index="0" data-insert-before-id="100">${bookmark(1)}${group(0, 101)}</div><div data-role="folder-items" data-folder-id="10" data-column-index="1">${group(1, 102)}${bookmark(2)}</div></div>`;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-role="folder-items"]'));
}
function rect(el: Element, x: number, y: number, width = 200, height = 30) {
  el.getBoundingClientRect = () => ({ x, y, top:y, left:x, right:x+width, bottom:y+height, width, height, toJSON() {} });
}

test("column end resolves next logical root while fragment end resolves next group bookmark", () => {
  const [first, second] = columns();
  const items = first.querySelector<HTMLElement>('[data-role="group-items"]')!;
  items.dataset.insertBeforeId = "102";
  expect(getItemIdByIndex(first, 2)).toBe(100);
  expect(getItemIdByIndex(second, 0)).toBe(100);
  expect(getItemIdByIndex(items, 1)).toBe(102);
  expect(getItemIdByIndex(second, 2)).toBeUndefined();
});

test("group drag from continuation clones all bookmarks once and deduplicates selected group ids", () => {
  columns();
  const headers = Array.from(document.querySelectorAll<HTMLElement>('[data-role="group-header"]'));
  const roots = getSelectedTargetRoots(headers[1], [100, 100]);
  expect(getIdsFromElements(roots)).toEqual([100]);
  const previews = createDropPreview(roots);
  expect(previews).toHaveLength(1);
  expect(Array.from(previews[0].querySelectorAll('[data-role="folder-item"]')).map(el => (el as HTMLElement).dataset.id)).toEqual(["101", "102"]);
  expect(previews[0].querySelectorAll('[data-role="group-header"]')).toHaveLength(1);
  const dummy = createTabDummy([headers[1]], {clientX:0,clientY:0} as React.MouseEvent, true);
  expect(dummy.querySelectorAll('[data-role="folder-item"]')).toHaveLength(2);
});

test("item thresholds use drop container rect rather than offset parent", () => {
  const [first] = columns();
  rect(first, 0, 100, 200, 200);
  rect(first.children[0], 0, 120, 200, 30);
  rect(first.children[1], 0, 160, 200, 80);
  const [area] = calculateFoldersDropAreas([first], true);
  expect(getNewPlacementForItem(area, {clientY:130} as MouseEvent).index).toBe(0);
  expect(getNewPlacementForItem(area, {clientY:150} as MouseEvent).index).toBe(1);
});

test.each(["Escape", "blur", "dispose"])("whole-group drag hides every fragment and cleans up on %s", (cancel) => {
  const [first, second] = columns();
  rect(first, 0, 0, 200, 250); rect(second, 220, 0, 200, 250);
  const header = second.querySelector<HTMLElement>('[data-role="group-header"]')!;
  const states: boolean[] = [];
  const onState = (e: Event) => states.push((e as CustomEvent).detail);
  document.addEventListener("tablo-drag-state", onState);
  const onCancel = vi.fn(), onDrop = vi.fn();
  const dispose = processItemDragAndDrop({clientX:230,clientY:0} as React.MouseEvent, {isFolderItem:true,onDragStarted:()=>true,onDrop,onCancel,onClick:vi.fn()}, [header], {clearSelectedItemIds:vi.fn()} as any);
  document.dispatchEvent(new MouseEvent("mousemove", {clientX:240,clientY:50}));
  const fragments = Array.from(document.querySelectorAll<HTMLElement>('[data-role="folder"] [data-role="folder-group"]')).filter(el => !el.closest('[data-dad-preview="true"]'));
  expect(fragments.map(el=>el.style.display)).toEqual(["none","none"]);
  if (cancel === "Escape") document.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape"}));
  if (cancel === "blur") window.dispatchEvent(new Event("blur"));
  if (cancel === "dispose") dispose();
  expect(fragments.map(el=>el.style.display)).toEqual(["", ""]);
  expect(document.querySelector(".dad-dummy")).toBeNull();
  expect(states).toEqual([true,false]);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onDrop).not.toHaveBeenCalled();
  document.removeEventListener("tablo-drag-state", onState);
});

test("horizontal arrows reach another visual column in the same folder and skip hidden or preview links", () => {
  const [first, second] = columns();
  rect(first, 0, 0, 200, 250); rect(second, 220, 0, 200, 250);
  const links = Array.from(document.querySelectorAll<HTMLElement>('a'));
  links.forEach((link,index) => rect(link, index < 2 ? 0 : 220, index % 2 * 40));
  const hidden = document.createElement("div"); hidden.style.display="none"; hidden.innerHTML=bookmark(999); second.prepend(hidden);
  const preview = document.createElement("div"); preview.dataset.dadPreview="true"; preview.innerHTML=bookmark(998); second.prepend(preview);
  links[0].focus();
  handleBookmarksKeyDown({code:"ArrowRight",preventDefault:vi.fn()} as any,{spaces:[]},vi.fn());
  expect(document.activeElement).toBe(links[2]);
  handleBookmarksKeyDown({code:"ArrowLeft",preventDefault:vi.fn()} as any,{spaces:[]},vi.fn());
  expect(document.activeElement).toBe(links[0]);
  first.style.display="none";
  handleSearchKeyDown({code:"ArrowDown",preventDefault:vi.fn()} as any,vi.fn());
  expect(document.activeElement).toBe(links[2]);
});

test("selected group absorbs its selected children without duplicating a bookmark in preview", () => {
  columns();
  const child = document.querySelector<HTMLElement>('[data-id="101"]')!;
  const roots = getSelectedTargetRoots(child, [100, 101]);
  expect(getIdsFromElements(roots)).toEqual([100]);
});

test("hidden selected item at a column boundary is skipped for a root insertion", () => {
  const [first, second] = columns();
  first.querySelector<HTMLElement>('[data-role="folder-group"]')!.style.display="none";
  second.querySelector<HTMLElement>('[data-role="folder-group"]')!.style.display="none";
  expect(getItemIdByIndex(first, 1)).toBe(2);
});

test.each([
  { destination:"column", x:100, y:230, before:100, groupId:undefined },
  { destination:"fragment", x:100, y:180, before:102, groupId:100 },
  { destination:"header", x:100, y:70, before:undefined, groupId:100 },
  { destination:"last column", x:300, y:230, before:undefined, groupId:undefined },
])("sidebar drop into $destination emits the logical insertion target", ({destination,x,y,before,groupId}) => {
  const [first, second] = columns();
  const groupItems=first.querySelector<HTMLElement>('[data-role="group-items"]')!;
  groupItems.dataset.insertBeforeId="102";
  rect(first,0,0,200,250); rect(second,220,0,200,250);
  rect(first.children[0],0,20); rect(first.children[1],0,60,200,140);
  rect(second.children[0],220,0,200,120); rect(second.children[1],220,140);
  rect(first.querySelector('[data-role="group-header"]')!,20,60,180,30);
  rect(groupItems,20,90,180,110); rect(groupItems.children[0],20,100);
  const sidebar = document.createElement('a'); sidebar.dataset.id="900"; document.body.append(sidebar);
  const onDrop=vi.fn();
  processItemDragAndDrop({clientX:-10,clientY:100} as React.MouseEvent,{isFolderItem:false,onDragStarted:()=>true,onDrop,onCancel:vi.fn(),onClick:vi.fn()},[sidebar],{clearSelectedItemIds:vi.fn()} as any);
  document.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y}));
  if(destination === "header") expect(second.querySelector('[data-dad-preview="true"]')).not.toBeNull();
  document.dispatchEvent(new MouseEvent('mouseup'));
  expect(onDrop).toHaveBeenCalledWith(10,before,[900],groupId);
  expect(sidebar.style.display).toBe("");
});

test("dropping a bookmark lower in its own column resolves the target before restoring hidden sources", () => {
  document.body.innerHTML=`<div data-role="folder" data-folder-id="10"><div data-role="folder-items" data-folder-id="10">${bookmark(1)}${bookmark(2)}${bookmark(3)}</div></div>`;
  const container=document.querySelector<HTMLElement>('[data-role="folder-items"]')!;
  rect(container,0,0,200,200);
  Array.from(container.children).forEach((child,index)=>rect(child,0,index*40));
  const source=container.querySelector<HTMLElement>('[data-id="1"]')!;
  const onDrop=vi.fn();
  processItemDragAndDrop({clientX:0,clientY:0} as React.MouseEvent,{isFolderItem:true,onDragStarted:()=>true,onDrop,onCancel:vi.fn(),onClick:vi.fn()},[source],{clearSelectedItemIds:vi.fn()} as any);
  document.dispatchEvent(new MouseEvent('mousemove',{clientX:100,clientY:75}));
  document.dispatchEvent(new MouseEvent('mouseup'));
  expect(onDrop).toHaveBeenCalledWith(10,3,[1],undefined);
});


test("drop hit testing accepts the leading pixel of a column", () => {
  const [first, second] = columns();
  rect(first, 0, 0, 200, 250); rect(second, 220, 0, 200, 250);
  const areas = calculateFoldersDropAreas([first, second], true);
  expect(getOverlappedDropArea(areas, {clientX:220,clientY:0} as MouseEvent)?.element).toBe(second);
});

test("an empty intermediate column preserves the next logical root on sidebar drop", () => {
  document.body.innerHTML=`<div data-role="folder" data-folder-id="10"><div data-role="folder-items" data-folder-id="10" data-insert-before-id="2"></div><div data-role="folder-items" data-folder-id="10">${bookmark(2)}</div></div>`;
  const container=document.querySelector<HTMLElement>('[data-role="folder-items"]')!;
  rect(container,0,0,200,200);
  const source=document.createElement('a'); source.dataset.id="900"; document.body.append(source);
  const onDrop=vi.fn();
  processItemDragAndDrop({clientX:-10,clientY:100} as React.MouseEvent,{isFolderItem:false,onDragStarted:()=>true,onDrop,onCancel:vi.fn(),onClick:vi.fn()},[source],{clearSelectedItemIds:vi.fn()} as any);
  document.dispatchEvent(new MouseEvent('mousemove',{clientX:100,clientY:100}));
  document.dispatchEvent(new MouseEvent('mouseup'));
  expect(onDrop).toHaveBeenCalledWith(10,2,[900],undefined);
});

test("a folder spanning columns cleans up its dummy and drag state on cancellation", () => {
  columns();
  const folder=document.querySelector<HTMLElement>('[data-role="folder"]')!;
  rect(folder,0,0,420,250);
  const onCancel=vi.fn(), onDrop=vi.fn();
  const states:boolean[]=[];
  const listen=(e:Event)=>states.push((e as CustomEvent).detail);
  document.addEventListener('tablo-drag-state',listen);
  const dispose=processFolderDragAndDrop({clientX:0,clientY:0} as React.MouseEvent,{onCancel,onDrop,onDragStarted:()=>true,onChangeSpace:vi.fn()},folder);
  document.dispatchEvent(new MouseEvent('mousemove',{clientX:100,clientY:100}));
  const dummyColumns=Array.from(document.querySelectorAll<HTMLElement>('.dad-dummy [data-role="folder-items"]'));
  expect(dummyColumns).toHaveLength(2);
  expect(dummyColumns.map(column=>column.style.visibility)).toEqual(['hidden','hidden']);
  dispose();
  expect(folder.style.display).toBe('');
  expect(document.querySelector('.dad-dummy')).toBeNull();
  expect(states).toEqual([true,false]);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onDrop).not.toHaveBeenCalled();
  document.removeEventListener('tablo-drag-state',listen);
});

test("vertical arrows follow visual columns across separate folder rows and skip hidden links", () => {
  document.body.innerHTML=`<div data-role="folder"><div data-role="folder-items">${bookmark(1)}${bookmark(2)}</div><div data-role="folder-items">${bookmark(3)}</div></div><div data-role="folder"><div data-role="folder-items">${bookmark(4)}</div><div data-role="folder-items">${bookmark(5)}</div></div>`;
  const areas=Array.from(document.querySelectorAll<HTMLElement>('[data-role="folder-items"]'));
  areas.forEach((area,index)=>rect(area,index%2*220,Math.floor(index/2)*200,200,150));
  const links=Array.from(document.querySelectorAll<HTMLElement>('a'));
  links[1].parentElement!.style.display='none';
  links[0].focus();
  handleBookmarksKeyDown({code:'ArrowDown',preventDefault:vi.fn()} as any,{spaces:[]},vi.fn());
  expect(document.activeElement).toBe(links[3]);
  handleBookmarksKeyDown({code:'ArrowDown',preventDefault:vi.fn()} as any,{spaces:[]},vi.fn());
  expect(document.activeElement).toBe(links[2]);
  handleBookmarksKeyDown({code:'ArrowUp',preventDefault:vi.fn()} as any,{spaces:[]},vi.fn());
  expect(document.activeElement).toBe(links[3]);
});

test("multiple selected bookmarks cross a column boundary in selection order", () => {
  const [first,second]=columns();
  rect(first,0,0,200,250); rect(second,220,0,200,250);
  const roots=[document.querySelector<HTMLElement>('[data-id="1"]')!,document.querySelector<HTMLElement>('[data-id="2"]')!];
  const onDrop=vi.fn();
  processItemDragAndDrop({clientX:0,clientY:0} as React.MouseEvent,{isFolderItem:true,onDragStarted:()=>true,onDrop,onCancel:vi.fn(),onClick:vi.fn()},roots,{clearSelectedItemIds:vi.fn()} as any);
  document.dispatchEvent(new MouseEvent('mousemove',{clientX:100,clientY:230}));
  document.dispatchEvent(new MouseEvent('mouseup'));
  expect(onDrop).toHaveBeenCalledWith(10,100,[1,2],undefined);
  expect(roots.map(root=>root.parentElement!.style.display)).toEqual(['','']);
});

test.each(['Escape', 'drop', 'dispose'])("folder drag preserves its grid span until %s cleanup", (finish) => {
  document.body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,200px)"><div data-role="folder" data-folder-id="10" style="grid-column:span 2;visibility:visible"><div data-role="folder-items" data-folder-id="10">${bookmark(1)}</div></div><div data-role="folder" data-folder-id="20"><div data-role="folder-items" data-folder-id="20">${bookmark(2)}</div></div></div>`;
  const [source, neighbor] = Array.from(document.querySelectorAll<HTMLElement>('[data-role="folder"]'));
  rect(source, 0, 0, 400, 250);
  rect(neighbor, 420, 0, 200, 250);
  const onDrop = vi.fn();
  const dispose = processFolderDragAndDrop({clientX:0,clientY:0} as React.MouseEvent, {onDrop,onCancel:vi.fn(),onDragStarted:()=>true,onChangeSpace:vi.fn()}, source);
  document.dispatchEvent(new MouseEvent('mousemove', {clientX:430,clientY:100}));
  try {
    expect(getComputedStyle(source).display).not.toBe('none');
    expect(getComputedStyle(source).visibility).toBe('hidden');
    expect(getComputedStyle(source).gridColumn).toBe('span 2');
    expect(document.querySelector('.dad-folder-drop-indicator')).not.toBeNull();
  } finally {
    if (finish === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));
    if (finish === 'drop') document.dispatchEvent(new MouseEvent('mouseup'));
    if (finish === 'dispose') dispose();
  }
  expect(source.style.visibility).toBe('visible');
  expect(source.style.display).toBe('');
  expect(document.querySelector('.dad-dummy')).toBeNull();
  if (finish === 'drop') expect(onDrop).toHaveBeenCalledWith(10, undefined, 20);
  else expect(onDrop).not.toHaveBeenCalled();
});

test("horizontal arrows choose the nearest bookmark among stacked folders in the adjacent physical column", () => {
  document.body.innerHTML = `<div data-role="folder"><div data-role="folder-items">${bookmark(1)}</div></div><div data-role="folder"><div data-role="folder-items">${bookmark(2)}</div></div><div data-role="folder"><div data-role="folder-items">${bookmark(3)}</div></div><div data-role="folder"><div data-role="folder-items">${bookmark(4)}</div></div>`;
  const columns = Array.from(document.querySelectorAll<HTMLElement>('[data-role="folder-items"]'));
  rect(columns[0], 0, 0, 200, 600);
  rect(columns[1], 220, 0, 200, 200);
  rect(columns[2], 220, 220, 200, 380);
  rect(columns[3], 440, 0, 200, 600);
  const links = Array.from(document.querySelectorAll<HTMLElement>('a'));
  rect(links[0], 0, 500);
  rect(links[1], 220, 100);
  rect(links[2], 220, 490);
  rect(links[3], 440, 510);
  links[0].focus();
  const arrow = (code: string) => handleBookmarksKeyDown({code,preventDefault:vi.fn()} as any, {spaces:[]}, vi.fn());
  arrow('ArrowRight');
  expect(document.activeElement).toBe(links[2]);
  arrow('ArrowRight');
  expect(document.activeElement).toBe(links[3]);
  arrow('ArrowLeft');
  expect(document.activeElement).toBe(links[2]);
  arrow('ArrowLeft');
  expect(document.activeElement).toBe(links[0]);
});
