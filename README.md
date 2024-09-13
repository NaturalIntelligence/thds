# tsds
Time Sensitive Data Structure in Java script

## Expirable List
Entries moves to list of expired elements after a certain time. And deleted after defined conditions are met. You can use this datatype in multiple ways, Eg
- deleting sessions after a predefined inactive time.
- cache management
- token expiry

```js
const ExpirableList = require("tsds/ExpirableList");
const onExpiry = (key, data) => { ... };
const onCleanup = () => { ... };

const list = new ExpirableList({
  entryLifespan: 1000, 
  cleanupInterval: 2500,
  maxExpiredEntries: 1000
  },onExpiry, onCleanup);

list.add(12345);
list.add("abc", { data: "something"});
const data = list.get("abc");
:
list.delayExpiry("abc"), 600);
:
list.pause(); // pause the list to expire any existing entity
list.resume();
:
list.life(12345); // how long a key is in this list
list.removeEntry(12345);
:
list.forEachExpired((k,v)=>{
  :
});
list.forEachNonExpired((k,v)=>{
  :
});
:
list.clean(); //to manually clean the list of expired entities

```