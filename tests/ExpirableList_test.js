const ExpirableList = require("./../src/ExpirableList")

let now
describe("Expirable List", function() {
  
  it("an element should expire automatically", function(done) {
    let seqCount = 0;
    const expiringSeq = [12345, "abc"];
    const onExpiry = (key, data) => {
      expect(key).toEqual(expiringSeq[seqCount++]);
    }
    const onCleanup = () => {
      console.log("Removing Expired data @ ", Date.now()-now);
    } 
    const list = new ExpirableList({entryLifespan: 1000, cleanupInterval: 2500},onExpiry);
    now= Date.now();
    list.add(12345);
    list.add("abc", { data: "something"});

    setTimeout(() => list.delayExpiry("abc"), 600);
    
    setTimeout(() => validate(list,[12345,"abc"],[]), 501); //12345, "abc" both are non expired
    setTimeout(() => validate(list,["abc"],[12345]), 1100);//12345 expired, "abc" not expired
    setTimeout(() => validate(list,["abc"],[12345]), 1800);//"abc" will be expired in next cycle 
    setTimeout(() => validate(list,[],[12345,"abc"]), 2100);//expired at 2nd cycle
    setTimeout(() => {
      validate(list,[],[]); 
      list.pause();
      done();
    }, 3001);//12345, "abc" both are cleaned
  });
});

function validate(list, nonExpired, expired){
  console.log("validate @", Date.now()-now)
  const e = compareMapKeys(expired, list.expiredEntries, "expired");
  const ne =  compareMapKeys(nonExpired, list.entries, "nonExpired");
  expect( e && ne ).toBeTrue();
  
  // console.log("Expired:");
  // list.forEachExpired((key, data) =>{
  //   console.log(key, data);
  // })
  // console.log("NonExpired:");
  // list.forEachNonExpired((key, data) =>{
  //   console.log(key, data);
  // })
}

function compareMapKeys(keys1, map2, label) {
  const keys2 = Array.from(map2.keys()).sort();
  console.log(label, "Expected:", keys1, ", Actual:", keys2);

  if (keys1.length !== keys2.length) {
    return false;
  }
  
  return keys1.every((key, index) => key === keys2[index]);
}