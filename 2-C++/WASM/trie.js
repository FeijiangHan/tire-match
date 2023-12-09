const fs = require('fs');
const csv = require('csv-parser');
const createTrieModule = require('./trie.js');

// 创建Trie对象
const createTrie = () => {
  const trieModule = createTrieModule();
  const trie = {
    module: trieModule,
    triePtr: trieModule._createTrie(),
    insert: (word) => {
      const wordPtr = trieModule.allocateUTF8(word);
      trieModule._trieInsert(trie.triePtr, wordPtr);
      trieModule._free(wordPtr);
    },
    search: (word) => {
      const wordPtr = trieModule.allocateUTF8(word);
      const result = trieModule._trieSearch(trie.triePtr, wordPtr);
      trieModule._free(wordPtr);
      return result;
    },
    searchPrefix: (prefix) => {
      const prefixPtr = trieModule.allocateUTF8(prefix);
      const countPtr = trieModule.allocate(
        Int32Array.of(0),
        trieModule.ALLOC_NORMAL
      );
      const resultPtr = trieModule._trieSearchPrefix(
        trie.triePtr,
        prefixPtr,
        countPtr
      );
      const count = trieModule.getValue(countPtr, 'i32');
      const result = [];
      for (let i = 0; i < count; i++) {
        const itemPtr = trieModule.getValue(resultPtr + i * 4, '*');
        result.push(trieModule.UTF8ToString(itemPtr));
      }
      trieModule._free(prefixPtr);
      trieModule._free(countPtr);
      trieModule._free(resultPtr);
      return result;
    },
    destroy: () => {
      trieModule._destroyTrie(trie.triePtr);
    },
  };
  return trie;
};

// 读取关键词列表
const keywords = [];
fs.createReadStream('keywords.csv')
  .pipe(csv())
  .on('data', (data) => {
    keywords.push(data.keyword);
  })
  .on('end', () => {
    // 读取文本内容
    const text = fs.readFileSync('text.txt', 'utf8');

    // 创建并构建Trie树
    const trie = createTrie();
    keywords.forEach((keyword) => {
      trie.insert(keyword.trim());
    });

    // 进行匹配
    const matches = trie.searchPrefix(text);

    // 输出匹配结果
    matches.forEach((match) => {
      console.log(match);
    });

    // 销毁Trie树
    trie.destroy();
  });