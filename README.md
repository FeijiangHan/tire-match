# Optimizing Massive Keyword Matching from Hours to Minutes - Step by Step

## The Problem 

A few days ago at work, I encountered the following problem:

> There are 600,000 short message log records, each around 50 characters, and 50,000 keywords, 2-8 characters in length, mostly Chinese. The task is to extract all keywords contained in the 600,000 records and count the number of hits for each keyword.

This article fully introduces my implementation approach, showing how I optimized a task that took 10 hours to run to under 10 minutes. Although the implementation language is PHP, this article focuses more on the concepts, which should be helpful to everyone.

## Original - grep

### Design

When I first received the task, my mind immediately started turning - "*logs + keywords + statistics*". I didn't think of writing the code to implement it myself, but first thought of the common Linux log statistics command `grep`.

The `grep` command usage won't be elaborated on further. Using `grep 'keyword' | wc -l` can easily perform statistics on the number of messages containing the keyword. And PHP's `exec()` function allows us to directly call Linux shell commands, although there are security risks when executing dangerous commands.

### Code 

Pseudocode:

```php
foreach ($word_list as $keyword) {
    $count = intval(exec("grep '{$keyword}' file.log | wc -l"));
    record($keyword, $count); 
}
```

I ran it on an old machine, and it took 6 hours, probably 2-3 hours on a newer machine. The following optimizations all used a new machine, and the requirements changed again, the real content is just beginning.



## Evolution - Regex

### Design

After completing the task, the product came up with new ideas the next day, saying that a certain data source would be connected in the future, and the messages would be delivered as a data stream rather than a file. It also required real-time statistics on the messages, which overturned my idea of writing data to a file and then performing statistics. To make the solution extensible, the statistical object was no longer a whole, but needed to consider taking **n** single messages for matching.

At this point, I had no choice but to use the most traditional tool - `regex`. Implementing regex is not difficult, and regex matching functions are well encapsulated in each language. The focus is on pattern construction.

Of course, pattern construction here is not difficult either, `/keyword1|keword2|.../`, use `|` to connect keywords. 

### Regex Pitfalls

Here are two pitfalls encountered during use:

- **Regex pattern too long causes matching failure**: PHP regex has a backtracking limit to prevent consuming all available process stack and ultimately causing PHP to crash. Excessively long patterns will cause PHP to detect too much backtracking and interrupt matching. Testing shows the maximum default pattern length is about 32000 bytes. The `pcre.backtrack_limit` parameter in php.ini is the maximum backtracking limit, default to 1000000. Modifying php.ini or using `ini_set('pcre.backtrack_limit', n);` at the beginning of the script to set it to a larger number can increase the maximum pattern length for a single match. Of course you can also perform statistics on keywords in batches (what I did=_=).
- **Many warnings due to special characters in pattern**: Found during matching that PHP reported many warnings: "unknown modifier gibberish". After careful inspection, there are `/` characters in the keywords, which can be filtered out with the `preg_quote()` function.

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

To complete the task, I gritted my teeth and ran the process overnight. When I found it took nearly ten hours the next day, I was devastated... It was too slow to meet the usage requirements at all. At this point, I had already started considering changing methods.

When the product changed some keywords again and required re-running it, indicating that keywords would continue to be optimized, I completely denied the existing solution. I absolutely could not use keywords to match messages, matching each message with all keywords like this, the efficiency was unbearable.



## Awakening - Splitting Words

### Design

I finally started realizing that I should compare the information against keywords. If I build a hash table with keywords as keys, and look up the words in the information in the hash table, matching hits would be found if lookups are successful. This way, the efficiency could reach O(1), right?

But how do I split a short message into exactly the right words for matching? Word segmentation? Word segmentation also takes time, and my keywords are meaningless words without context. Building a dictionary and using a tokenizer would introduce huge problems. Ultimately I thought of "splitting words". 

Why is it called splitting words? I consider breaking down a sentence into "all possible" words by brute force. For example, the sentence "我是好人" can be broken down into words like "我是", "是好", "好人", "我是好", "是好人", "我是好人", etc. My keyword length is 2-8, so the number of split words would increase rapidly with sentence length. However, punctuation, spaces, and function words (such as "的", "是", etc.) can be used as separators to break the sentence into short phrases first before splitting, which would greatly reduce the number of split words.

In fact, word segmentation was not fully implemented and was replaced by the next method, it was just a highly feasible concept, I wrote some pseudocode to implement it for reference when writing this article, even if it's not used for keyword matching, it may still be applicable elsewhere. 

### Code

```php
$str_list = getStrList($msg);
foreach ($str_list as $str) {
   $keywords = getKeywords($str);
   foreach ($keywords as $keyword) {
       // Direct hash table lookup implementation in PHP for fast lookup
       if (isset($word_list[$keyword])) {
           record($keyword);
       }
   }
}
/**
 * Split message into short phrases
 */
function getStrList($msg) {
  $str_list = array();
  $seperators = array(',', '。', '的', ...);

  $words = preg_split('/(?<!^)(?!$)/u', $msg);
  $str = array();
  foreach ($words as $word) {
      if (in_array($word, $seperators)) {
          $str_list[] = $str; 
          $str = array();
      } else {
          $str[] = $word;
      }
  }

  return array_filter($str_list);
}

/**
 * Extract keywords from each phrase
 */
function getKeywords($str) {
  if (count($str) < 2) {
      return array();
  }

  $keywords = array();
  for ($i = 0; $i < count($str); $i++) {
      for ($j = 2; $j < 9; $j++) {
          $keywords[] = array_slice($str, $i, $j); // todo Limit to not exceed maximum array length
      }
  }

  return $keywords;
}
```

### Results

We know that a UTF-8 Chinese character takes up three bytes of storage. Using a simple `split()` function would not properly split strings into individual characters including English and Chinese. 

Here, `preg_split('/(?<!^)(?!$)/u', $msg)` uses a regex to match the empty string '' between two characters, while the two capturing groups (`(?<!^)(?!$)`) are used to specify that the match should not be the first or last character (the capturing groups are not strictly necessary, using just `//` as the pattern would result in an extra empty string item at the front and back of the split result).

Since it was not fully implemented, the efficiency is unknown. Estimating an average short phrase length of around 10 characters, with each short message being around 50 characters, it would split out around 200 words. Although it would split out many meaningless words, I believe the efficiency would not be low, and due to the high efficiency of hashing, it may even be faster than the ultimate method.

This approach was ultimately not used because it imposed too many requirements on sentences, the separators during splitting were hard to determine, and most importantly, it was not elegant enough...I didn't really want to implement this method, as counting identifiers and function words seemed a bit clumsy, and splitting out so many meaningless words seemed like a huge waste of efficiency.



## Ultimate - Trie Tree

### Trie

So I asked Google for help again. Some people suggested using a trie tree for searching large amounts of data matching. I didn't expect the trie tree I just learned would come in handy so soon.

Of course, I've also copied my explanation at the time here for lazy people (you can skip this section if you've read it).

> A trie, also called a prefix tree or digital tree, is an ordered tree that is used to store associative arrays where the keys are usually strings. Unlike a binary search tree, no node in the tree stores the key directly. Instead, its position in the tree defines the key with which it is associated. All descendants of a node have a common prefix of the string associated with that node, and the root is associated with the empty string. 

### design

So how does a trie tree implement keyword matching? Here is an illustration:

![img](https://ask.qcloudimg.com/http-save/yehe-1148723/0jsxtcpowe.png)

Key points:

#### Constructing a trie tree

1. Split the keywords into individual characters using the preg_split() function introduced above. For example, "scientist" would be split into the three characters "科", "学", "家".  
2. Add a special character "`" after the last character. This character serves as the end of a keyword (represented by the pink triangle in the diagram), to identify when a full keyword has been matched (otherwise we wouldn't know if matching "科", "学" counted as a successful match).
3. Check if the root node contains the first character ("科"). If so, proceed to step 4. If not, add a node with value "科" to the root.
4. Sequentially check for and add the "学", "家" nodes. 
5. Add the "`" node at the end, and continue inserting the next keyword.

#### Matching

Now we use the example sentence "这位科学家很了不起！" to perform matching.

1. First, split the sentence into individual characters 这、位、...;
2. Starting from the root, query for the first character "这" - since there is no keyword starting with this character, move the "pointer" forward until reaching a character node that exists at the root, which is "科";
3. Then search for the "学" node under the "科" node. Once found, the depth of the result subtree has reached 2 already, and the minimum length of a keyword is 2. At this point, check if there is a "`" node under the "学" node. Finding it means a match is successful, return the keyword, and move the character "pointer" forward. If not found, continue searching for the next character under this node.
4. Traverse in this way until the end, returning all matching results.

### Code

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
// Can also use global variable to store matched characters instead of $matched
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

The results were of course pleasing - matching 1000 records took only about 3 seconds with this method. I had a Java colleague try it and Java could process 1000 records in just 1 second.  

Let's analyze why this method is so fast:

- Regex matching: Needs to match all keywords against message, complexity is `key_len * msg_len`. Of course regex optimizes this, but efficiency can be imagined starting from this baseline.
- Trie tree is at worst `msg_len * 9` (longest keyword + 1 special char) hash lookups, i.e. when keywords are like `AAA` and message is `AAA...`. The probability of this situation is obvious.

The optimization of methods ends here. Improving from 10 records per second to 300 records is a huge 30 times performance gain.



## Other Path - Multiprocessing

### Design

With optimization of the matching method completed, the goal mentioned at the beginning of reducing to under 10 minutes still wasn't achieved. Now I had to consider other methods.

When it comes to efficiency, concurrency naturally comes to mind. PHP is single-threaded (although there are unusable multi-threading extensions), so there are no good solutions for concurrency. I could only use multiple processes.

So how do multiple processes read the same log file? Here are some solutions:

- Add log line counter in process, pass in parameter n to each process, process only handles lines where `line num % n = n`. I'm very familiar with this hacky distributed computing method already, haha. This method requires parameter passing and memory allocation for entire log in each process, and is not very elegant.
- Use Linux `split -l n file.log output_pre` to split file into files with n lines each, then have multiple processes read multiple files. Drawback is lack of flexibility, need to re-split if changing process count.
- Use Redis list queue to temporarily store logs, start multiple processes to consume the queue. This method requires additional writing to Redis, adding a step, but is flexible to scale and simple elegant code.

Finally, the third method was implemented. I also attempted to deploy an MPI cluster to split the processing and parallelize it.

### Results

This method would still have bottlenecks, likely ending up on Redis network I/O. I didn't have the patience to start n processes to stress test company Redis. Running 10 processes completed statistics in 3-4 minutes. Even adding Redis write time, well under 10 minutes.

At the start, product had positioned matching speed at the hour level. Seeing their surprised expression when I came back with new log match results in 10 minutes made me feel slightly proud, haha.



## Summary

There are many ways to solve problems. I believe that before solving various problems, you need to learn about many different concepts, even if only knowing their purpose. It's like having a toolkit, you should first stock it with as many tools as possible before being able to select the most suitable one when encountering a problem. Then of course you need to master using these tools proficiently in order to apply them to solve some unusual problems.

**To do a good job, you must first sharpen your tools.** To solve performance issues, mastering system-level methods is still insufficient. Sometimes changing the data structure or algorithm may have better results. I feel my knowledge in this area is still lacking, and will strengthen it slowly. I hope everyone can work hard together.

