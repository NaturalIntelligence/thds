const ExpirableList = require("./../src/ExpirableList")

let now
describe("Expirable List", function() {
  it("should throw an error when adding non-primitive key", function() {
    const list = new ExpirableList({ entryLifespan: 1000 });
  
    expect(() => list.add({ objKey: "value" }, { some: "data" })).toThrowError("only primitive types are supported");
  });
  it("an element should expire automatically", function(done) {
    let seqCount = 0;
    let cleanUpHappened = false;
    const expiringSeq = [12345, "abc"];
    const onExpiry = (key, data) => {
      expect(key).toEqual(expiringSeq[seqCount++]);
    }
    const onCleanup = () => {
      cleanUpHappened = true;
      // console.log("Removing Expired data @ ", Date.now()-now);
    } 
    const list = new ExpirableList({entryLifespan: 1000, cleanupInterval: 2500},onExpiry, onCleanup);
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
      expect(cleanUpHappened ).toBeTrue();
      done();
    }, 3001);//12345, "abc" both are cleaned
  });
  it("should clean expired entries when maxExpiredEntries is reached", function(done) {
    let cleanupTriggered = false;
    const onCleanup = () => {
      cleanupTriggered = true;
    };
    const list = new ExpirableList({ 
      entryLifespan: 500, 
      cleanupInterval: 5000, 
      maxExpiredEntries: 2 }, null, onCleanup);
  
    list.add(1, "data1");
    list.add(2, "data2");
    list.add(3, "data3");
  
    setTimeout(() => {
      list.add(4, "data4");
      list.add(5, "data5");
    }, 600); // Add more entries after the first ones expire
  
    setTimeout(() => {
      expect(list.expiredEntries.size).toBeLessThanOrEqual(2); // Should never exceed maxExpiredEntries
      expect(cleanupTriggered).toBeTrue(); // Cleanup should have been triggered
      done();
    }, 1500);
  });
  it("should delay expiry beyond lifespan", function(done) {
    const list = new ExpirableList({ entryLifespan: 1000 });
  
    list.add("delayedEntry", { some: "data" });
    
    setTimeout(() => list.delayExpiry("delayedEntry"), 900); // Delay the expiry just before it's supposed to expire
  
    setTimeout(() => {
      validate(list, ["delayedEntry"], []); // Should still be non-expired
      done();
    }, 1100);
  });
  it("should pause and resume expiry checks", function(done) {
    const list = new ExpirableList({ entryLifespan: 1000 });
  
    list.add("pausedEntry", { some: "data" });
  
    setTimeout(() => {
      list.pause();
    }, 500); // Pause expiration after half the lifespan
  
    setTimeout(() => {
      validate(list, ["pausedEntry"], []); // Entry should still be non-expired after pause
      list.resume();
    }, 1200); // Resume after pause
  
    setTimeout(() => {
      validate(list, [], ["pausedEntry"]); // Should expire after resume
      done();
    }, 1800);
    
    
  });
  
  it("should expire correctly after multiple delays", function(done) {
    const list = new ExpirableList({ entryLifespan: 1000 });
  
    list.add("delayedKey", { some: "data" });
  
    setTimeout(() => list.delayExpiry("delayedKey"), 900); // Delay first
    setTimeout(() => list.delayExpiry("delayedKey"), 1600); // Delay again
  
    setTimeout(() => {
      validate(list, ["delayedKey"], []);
    }, 1900); // Still not expired
  
    setTimeout(() => {
      validate(list, [], ["delayedKey"]); // Should expire
      done();
    }, 3600);
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