### EfficientStringMatching

EfficientStringMatching is a tool aimed at enhancing the performance of string matching operations, reducing the processing time from 10 hours using regular expressions to a rate of 1,000 records per second. This tool offers two versions: a pure JavaScript version and a WebAssembly (WASM) version.

The tool utilizes a Trie data structure along with optimized algorithms to achieve efficient string matching. By leveraging the advantages of the Trie tree, it enables rapid matching of multiple keywords within a given text, resulting in improved matching efficiency and reduced memory consumption.

#### Features

- Two Versions: The tool provides two versions - a pure JavaScript version and a WebAssembly (WASM) version, allowing users to choose the implementation that best suits their needs.
- Optimized Trie Algorithm: The tool employs a Trie data structure along with optimized algorithms, resulting in reduced memory usage and improved performance.
- Flexible Keyword Management: It supports dynamic addition, deletion, and updating of keywords, providing flexibility in managing the keyword collection.
- Versatile Use Cases: The tool finds applications in various scenarios such as text processing, keyword filtering, sensitive word detection, and more. It offers flexible interfaces and usage methods to cater to different use cases.

#### WebAssembly (WASM) Compilation Instructions

To compile the WebAssembly version of EfficientStringMatching, follow these instructions:

1. Install the required dependencies and tools for compiling WebAssembly modules.
2. Run the appropriate compilation command based on your target platform and preferred configuration.
3. Once the WebAssembly module is compiled, integrate it into your JavaScript application and utilize the provided APIs for efficient string matching operations.

```
emcc trie.cpp -o trie.js -s EXPORTED_FUNCTIONS="['_createTrie', '_destroyTrie', '_trieInsert', '_trieSearch', '_trieSearchPrefix', '_freeStringArray']" -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' -s MODULARIZE=1 -s 'EXPORT_NAME="createTrieModule"'
```

## Usage

1. Install the necessary dependencies:
```shell
npm install
```

2. Prepare the input files:
- Create a `keywords.csv` file containing the keywords to be matched in a column labeled "keyword".
- Create a `text.txt` file containing the text to be checked for matches.

3. Run the tool:
```shell
node index.js
```

4. View the matches:
The tool will output the matched strings to the console.

---