### Notes
e.preventDefault() --> Prevent default behavior of key clicks and be able to take over
e.stopPropagation() --> Similar thing, deals with bubbling

Project based off both repos below (which are both open source MIT license):
https://github.com/matthewsot/docs-plus
https://github.com/matthewsot/docs-vim


### How the dependencies work:

main.js
↓
docs.js
↓
jquery_min.js

- No circular dependencies
