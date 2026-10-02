const assert=require("assert");
const clips=[
 {id:"v1",type:"video",start:0,duration:3},
 {id:"v2",type:"video",start:3,duration:2},
 {id:"a1",type:"audio",start:1,duration:4},
 {id:"t1",type:"text",start:.5,duration:1}
];
const total=Math.max(...clips.map(c=>c.start+c.duration));
assert.strictEqual(total,5);
const at35=clips.filter(c=>3.5>=c.start&&3.5<c.start+c.duration);
assert(at35.some(c=>c.id==="v2"));
assert(at35.some(c=>c.id==="a1"));
console.log("MODEL_TEST=PASS");
