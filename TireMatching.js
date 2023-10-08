/*
Full Name: Feijianghan
Date: 2023
*/

const fs = require('fs');
const csv = require('csv-parser');

class Trie {
  constructor() {
    this.root = { depth: 0, next: {} };
    this.matched = [];
  }

  append(keyword) {
    const words = Array.from(keyword);
    words.push('`');
    this.insert(this.root, words);
  }

  match(str) {
    this.matched = [];
    const words = Array.from(str);

    while (words.length > 0) {
      const matched = [];
      const res = this.query(this.root, words, matched);
      if (res) {
        this.matched.push(matched.join(''));
      }
      words.shift();
    }

    return this.matched;
  }

  insert(node, words) {
    if (words.length === 0) {
      return;
    }
    const word = words.shift();
    if (node.next.hasOwnProperty(word)) {
      this.insert(node.next[word], words);
    } else {
      const tmpNode = { depth: node.depth + 1, next: {} };
      node.next[word] = tmpNode;
      this.insert(node.next[word], words);
    }
  }

  query(node, words, matched) {
    const word = words.shift();
    if (node.next.hasOwnProperty(word)) {
      matched.push(word);
      if (node.next[word].next.hasOwnProperty('`')) {
        return true;
      }
      return this.query(node.next[word], words, matched);
    } else {
      matched.length = 0;
      return false;
    }
  }
}

// Read keywords from CSV file
const keywords = [];
fs.createReadStream('keywords.csv')
  .pipe(csv())
  .on('data', (data) => {
    keywords.push(data.keyword);
  })
  .on('end', () => {
    // Read text to be matched from file
    const text = fs.readFileSync('text.txt', 'utf8');

    // Create and populate trie
    const trie = new Trie();
    keywords.forEach(keyword => {
      trie.append(keyword.trim());
    });

    // Perform matching
    const matches = trie.match(text);

    // Output matches
    matches.forEach(match => {
      console.log(match);
    });
  });
