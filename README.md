# Optimizing Massive Keyword Matching from Hours to Minutes - Step by Step

## The Problem 

A few days ago at work, I encountered the following problem:

> There are 600,000 short message log records, each around 50 characters, and 50,000 keywords, 2-8 characters in length, mostly Chinese. The task is to extract all keywords contained in the 600,000 records and count the number of hits for each keyword.

This article fully introduces my implementation approach, showing how I optimized a task that took 10 hours to run to under 10 minutes. Although the implementation language is PHP, this article focuses more on the concepts, which should be helpful to everyone.

## Original - grep

### Design

When I first received the task, my mind immediately started turning - "logs + keywords + statistics". I didn't think of writing the code to implement it myself, but the first thought of the common Linux log statistics command `grep`.

The `grep` command usage won't be elaborated on further. Using `grep 'keyword' | wc -l` can easily perform statistics on the number of messages containing the keyword. PHP's `exec()` function allows us to directly call Linux shell commands, although there are security risks when executing dangerous commands.

### Code 

Pseudocode:

```php
foreach ($word_list as $keyword) {
    $count = intval(exec("grep '{$keyword}' file.log | wc -l"));
    record($keyword, $count); 
}
```

I ran it on an old machine, and it took 6 hours, probably 2-3 hours on a newer machine. The following optimizations all used a new machine, and the requirements changed again, the real content is just beginning.

*The original idea and method.*

## Evolution - Regex

### Design

After completing the task, the product came up with new ideas the next day, saying that a certain data source would be connected in the future, and the messages would be delivered as a data stream rather than a file. It also required real-time statistics on the messages, overturning my idea of writing data to a file and then performing statistics. To make the solution extensible, the statistical object was no longer a whole, but needed to consider taking n single messages for matching.

At this point, I had no choice but to use the most traditional tool - `regex`. Implementing regex is not difficult, and regex matching functions are well encapsulated in each language. The focus is on pattern construction.

Of course, pattern construction here is not difficult either, `/keyword1|keword2|.../`, use `|` to connect keywords. 

### Regex Pitfalls

Here are two pitfalls encountered during use:

- Regex pattern too long causes matching failure: PHP regex has a backtracking limit to prevent consuming all available process stack and ultimately causing PHP to crash. Excessively long patterns will cause PHP to detect too much backtracking and interrupt matching. Testing shows the maximum default pattern length is about 32000 bytes. The `pcre.backtrack_limit` parameter in php.ini is the maximum backtracking limit, default to 1000000. Modifying php.ini or using `ini_set('pcre.backtrack_limit', n);` at the beginning of the script to set it to a larger number can increase the maximum pattern length for a single match. Of course you can also perform statistics on keywords in batches (what I did=_=).
- Many warnings due to special characters in pattern: Found during matching that PHP reported many warnings: "unknown modifier gibberish". After careful inspection, there are `/` characters in the keywords, which can be filtered out with the `preg_quote()` function.

### Code

Pseudocode:

```php
$end = 0;  
$step = 1500;
$pattern = array();
// First split pattern into multiple small blocks
while ($end < count($word_list)) {
    $tmp_arr = array_slice($word_list, $end, $step);
    $end += $step;
    $item = implode('|', $tmp_arr);
    $pattern[] = preg_quote($item); 
}

$content = file_get_contents($log_file);  
$lines = explode("\n", $content);
foreach ($lines as $line) {
    // Use each small pattern block to match separately 
    for ($i = 0; $i < count($pattern); $i++) {
        preg_match_all("/{$pattern[$i]}/", $line, $match);
    }
    $match = array_unique(array_filter($match));
    dealResult($match);
}
```

I gritted my teeth and ran the process overnight to complete the task. When I found it took nearly ten hours the next day, I was devastated... It was too slow to meet the usage requirements at all. At this point, I had already started considering changing methods.

When the product changed some keywords again and required re-running, indicating that keywords would continue to be optimized, I completely denied the existing solution. I absolutely could not use keywords to match messages; the efficiency was unbearable to match each message with all keywords like this.

*Evolution, the evolution of requirements and implementation.*

## Awakening - Word Breaking 

### Design

So, I asked Uncle Google for help again. Some people suggested using a trie tree for searching large amounts of data matching. I didn't expect the trie tree I learned to come in handy so soon. 

Of course, I've also copied my explanation at the time here for lazy people (you can skip this section if you've read it).

> A trie, also called a prefix tree or digital tree, is an ordered tree used to store associative arrays where the keys are usually strings. Unlike a binary search tree, no node in the tree stores the key directly. Instead, its position in the tree defines the key with which it is associated. All descendants of a node have a common prefix of the string associated with that node, and the root is associated with the empty string. 

So, how does a trie tree implement keyword matching? Here is an illustration:

![img](https://ask.qcloudimg.com/http-save/yehe-1148723/0jsxtcpowe.png)


Key points:

#### Construct trie tree

1. Split keywords into individual characters using the `preg_split()` function described above. For example, `scientist` is split into `s, c, i, e, n, t, i, s, t`.
2. Add a special character ``` after the last character to mark the end of a keyword (the pink triangles in the figure). This character identifies when a keyword has been found (otherwise, we would not know if matching `s, c, i, e, n` characters count as a successful match). 
3. Check if a node exists for the first character (`s`) at the root. If there is, go to `Step 4`. If not, add a node with value `s` at the root.
4. Sequentially check and add nodes for `c, i, e` and so on. 
5. Add the ``` node at the end, and continue inserting the next keyword.

#### Matching 

Let's use the sentence `This scientist is very awesome!` as an example for matching:

- First, we split the sentence into individual characters `T, h, i, s, ...`;
- Start from the root and check if there is a keyword starting with `T`, there isn't, so move the "pointer" ahead until finding `s` under root;
- Then look for node `c` under `s`, if found, the subtree depth is already 2, and the minimum keyword length is 2, so we need to check if there is a ``` under `c`, finding it means a successful match, return the keyword, and move the character "pointer" ahead. If not found, continue searching for the next character under this node.
- Traverse like this until the end and return all matched results.

### Code

I've uploaded the complete code to GitHub: [Trie-GitHub-zhenbianshu](https://github.com/zhenbianshu/DataStructureAndAlgorithm/blob/master/keyword_match_trie.php). Here is the key part.

First is the node structure design, which is also crucial:

```php
$node = array(
  'depth' => $depth, // Depth, used to determine matched word count
  'next' => array(
    $val => $node, // Taking advantage of PHP array hash implementation for fast child node lookup
    ...
  ), 
);
```

Then inserting child nodes during tree construction:

```php
// Pass in $node by reference here for inserting child nodes
private function insert(&$node, $words) {
     if (empty($words)) {
        return;
     }
     $word = array_shift($words);
     // If child node already exists, continue inserting into it
     if (isset($node['next'][$word])) {
         $this->insert($node['next'][$word], $words);
     } else {
         // Construct and insert child node if doesn't exist
         $tmp_node = array(
             'depth' => $node['depth'] + 1,
             'next' => array(),
         );
         $node['next'][$word] = $tmp_node;
         $this->insert($node['next'][$word], $words);
     }
}
```

Finally, operations during querying:

```php
// Can also use a global variable to store matched characters instead of $matched
private function query($node, $words, &$matched) {
    $word = array_shift($words);
    if (isset($node['next'][$word])) {
        // If corresponding child node exists, add to result set
        array_push($matched, $word);
        // Can determine if at word end when depth reaches minimum keyword length 
        if ($node['next'] > 1 && isset($node['next'][$word]['next']['`'])) {
            return true;
        }
        return $this->query($node['next'][$word], $words, $matched);
    } else {
        $matched = array();
        return false; 
    }
}
```

### Results

The results were, of course, pleasing - matching 1000 records took only about 3 seconds with this method. I had a Java colleague try it and Java could process 1000 records in just 1 second.  

Let's analyze why this method is so fast:

- Regex matching: Needs to match all keywords against message, complexity is `key_len * msg_len`. Of course regex optimizes this, but efficiency can be imagined starting from this baseline.
- Trie tree is at worst `msg_len * 9` (longest keyword + 1 special char) hash lookups, i.e., when keywords are like `AAA` and message is `AAA...`. The probability of this situation is obvious.

The optimization of methods ends here. Improving from 10 records per second to 300 records is a huge 30 times performance gain.

*Final level, but not necessarily the ultimate.*

## Other Path - Multiprocessing

### Design

With the optimization of the matching method completed, the goal mentioned at the beginning of reducing to under 10 minutes still wasn't achieved. Now I had to consider other methods.

When it comes to efficiency, concurrency naturally comes to mind. PHP is single-threaded (although there are unusable multi-threading extensions), so there are no good solutions for concurrency. I could only use multiple processes.

So how do multiple processes read the same log file? Here are some solutions:

- Add log line counter in process, pass in parameter n to each process, the process only handles lines where `line num % n = n`. I'm very familiar with this hacky distributed computing method already, haha. This method requires parameter passing and memory allocation for the entire log in each process and is not very elegant.
- Use Linux `split -l n file.log output_pre` to split files into files with n lines each, then have multiple processes read multiple files. The drawback is a lack of flexibility, the need to re-split if changing process count.
- Use Redis list queue to temporarily store logs, and start multiple processes to consume the queue. This method requires additional writing to Redis, adding a step, but is flexible to scale and simple elegant code.

Finally, the third method was used. 

### Results

This method would still have bottlenecks, likely ending up on Redis network I/O. I wasn't patient enough to start processes to stress test the company Redis. Running 10 processes completed statistics in 3-4 minutes. Even adding Redis write time, well under 10 minutes.

At the start, the product had positioned matching speed at the hour level. Seeing their surprised expression when I came back with new log match results in 10 minutes made me feel slightly proud, haha~

*Other paths can also take you further.*

## Summary

There are many ways to solve problems. I believe that before solving various problems, you need to learn about many different concepts, even if only knowing their purpose. It's like having a toolkit, you should first stock it with as many tools as possible before being able to select the most suitable one when encountering a problem. Then of course, you need to master using these tools proficiently in order to apply them to solve some unusual problems.

To do a good job, you must first sharpen your tools. To solve performance issues, mastering system-level methods is still insufficient. Sometimes changing the data structure or algorithm may have better results. I feel my knowledge in this area is still lacking and will strengthen it slowly. I hope everyone can work hard together.



#### Features

- Two Versions: The tool provides two versions - a pure JavaScript version and a WebAssembly (WASM) version, allowing users to choose the implementation that best suits their needs.
- Optimized Trie Algorithm: The tool employs a Trie data structure along with optimized algorithms, resulting in reduced memory usage and improved performance.
- Flexible Keyword Management: It supports dynamic addition, deletion, and updating of keywords, providing flexibility in managing the keyword collection.
- Versatile Use Cases: The tool finds applications in various scenarios such as text processing, keyword filtering, sensitive word detection, and more. It offers flexible interfaces and usage methods to cater to different use cases.

#### WebAssembly (WASM) Compilation Instructions

To compile the WebAssembly version of EfficientStringMatching, follow these instructions:

1. Install the required dependencies and tools for compiling WebAssembly modules.
2. Run the appropriate compilation command based on your target platform and preferred configuration.
3. Once the WebAssembly module is compiled, integrate it into your JavaScript application and utilize the provided APIs for efficient string-matching operations.

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
