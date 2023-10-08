# EfficientStringMatching

EfficientStringMatching is a tool for efficient string matching, aiming to improve the performance of string matching from 10 hours using regular expressions to processing 1,000 records per second. This tool is based on the Trie data structure, leveraging the advantages of the prefix tree to achieve fast string matching.

It can be used in various applications, including text processing, keyword filtering, sensitive word detection, and more. By constructing the keywords into a Trie tree, it enables fast matching of multiple keywords in a given text, thereby improving matching efficiency and accuracy.

## Features

- Efficient string matching: Implemented based on the Trie tree for fast string matching.
- Flexible keyword management: Supports dynamic addition, deletion, and updating of keywords, allowing flexible adjustment of the keyword collection.
- Multiple use cases: Suitable for various scenarios such as text processing, keyword filtering, sensitive word detection, etc., providing flexible interfaces and usage methods.

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

EfficientStringMatching是一个用于高效匹配字符串的工具，旨在将字符串匹配性能从使用正则表达式匹配的10小时提高到每秒处理1千条数据。该工具基于Trie数据结构实现，利用前缀树的优势，通过快速索引和查找，实现快速的字符串匹配。

该工具可以用于各种应用场景，包括文本处理、关键词过滤、敏感词检测等。通过将关键词构建成Trie树的形式，可以快速地在给定的文本中进行多个关键词的匹配，提高匹配效率和准确性。

主要功能特点:
- 高效的字符串匹配：基于Trie树实现，提供快速的字符串匹配能力。
- 灵活的关键词管理：支持动态添加、删除和更新关键词，可以根据需求灵活调整关键词集合。
- 多场景应用：可用于文本处理、关键词过滤、敏感词检测等多种场景，提供灵活的接口和使用方式。
