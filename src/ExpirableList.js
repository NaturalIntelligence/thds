const TSDSError = require("./TSDSError");

class ExpirableList {
  #shouldPause = false;
  entries = new Map();
  expiredEntries = new Map();
  #onExpiry;
  #onClean;

  constructor(config, eFn, cFn) {
    this.config = Object.assign({}, {
      entryLifespan: 1000, //ms
      cleanupInterval: 5000,
      maxExpiredEntries: 2000
    },config);
    this.#onExpiry = eFn || (() => {});
    this.#onClean = cFn || (() => {});
    if(this.config.cleanupInterval > this.config.expiryCheckInterval){
      throw new TSDSError("ExpirableList: Invalid config. cleanupInterval must be higher than expiryCheckInterval");
    }
    if(!this.config.expiryCheckInterval) 
      this.config.expiryCheckInterval = this.config.entryLifespan + 1;
    // console.log(this.config);
    this.#checkExpiredEntries();
    this.#cleanExpiredEntries()
  }

  pause(){
    this.#shouldPause = true;
  }
  resume(){
    if (!this.#shouldPause) return;  // Already running, no need to resume again
    this.#shouldPause = false;
    this.#checkExpiredEntries();
  }

  add(key, data, lifeSpan) {
    if(typeof key === 'object') throw Error("only primitive types are supported")
    // const id = generateId();
    const timestamp = Date.now();
    this.entries.set(key,{d: data, t:timestamp, e:lifeSpan||this.config.entryLifespan});
  }
  get(key) {
    const val = this.entries.get(key);
    return val.d;
  }

  delayExpiry(key, shouldErr) {
    const entry = this.entries.get(key);
    if (entry) {
      entry.t = Date.now();
    }else if(shouldErr){
      throw Error("Element not found");
    }
  }

  removeEntry(key) {
    this.entries.delete(key)
  }

  life(key){
    const val = this.entries.get(key);
    return Date.now() - val.t;
  }

  #checkExpiredEntries() {
    if(this.#shouldPause) return;

    const expired = this.#findExpiredEntries();
    const combinedSize = expired.size + this.expiredEntries.size;
    if (combinedSize > this.config.maxExpiredEntries) {
      this.clean();
    }
    
    //TODO: this.#onExpiry can slow this function for so many expired entries 
    // we can delay the  delete
    for (let key of expired.keys()) {
      // console.log(key, "expired")
      const entry = expired.get(key);
      this.#onExpiry(key, entry.d);
      this.expiredEntries.set(key, entry);
      this.entries.delete(key);
    }

    // Schedule next check
    setTimeout(() => this.#checkExpiredEntries(), this.config.expiryCheckInterval);
  }

  /**
   * Find expired entries
   * @returns {Map}
   */
  #findExpiredEntries() {
    const now = Date.now();
    const localExpired = new Map();

    for (let [key, entry] of this.entries) { //find expired entries
      const life = now - entry.t;
      // console.log("Life of ", key,":", life);
      if (life >= entry.e) {
        localExpired.set(key, entry);
      }
    }
    return localExpired;
  }

  #cleanExpiredEntries(){
    if(this.expiredEntries.size > 0) this.clean();
    setTimeout(() => this.#cleanExpiredEntries(), this.config.cleanupInterval);
  }


  forEachNonExpired(cb){
    for (let [key, entry] of this.entries) {
      cb(key, entry.d);
    }
  }
  
  forEachExpired(cb){
    for (let [key, entry] of this.expiredEntries) {
      cb(key, entry.d);
    }
  }

  /**
   * Remove all expired entries
   */
  clean(){
    if (this.#onClean) {
      this.#onClean();
    }
    this.expiredEntries = new Map();
  }

}

module.exports = ExpirableList;