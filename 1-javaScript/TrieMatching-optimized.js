const fs = require('fs');
const csv = require('csv-parser');

class TrieNode {
  constructor() {
    this.depth = 0;
    this.children = {};
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
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
      node.isEndOfWord = true;
      return;
    }

    const word = words.shift();
    if (!node.children.hasOwnProperty(word)) {
      node.children[word] = new TrieNode();
    }

    this.insert(node.children[word], words);
  }

  query(node, words, matched) {
    const word = words.shift();
    if (node.children.hasOwnProperty(word)) {
      matched.push(word);
      const childNode = node.children[word];
      if (childNode.isEndOfWord) {
        return true;
      }
      return this.query(childNode, words, matched);
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