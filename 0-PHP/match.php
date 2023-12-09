<?php

class Trie {
    /**
     * Node structure
     *
     * node = array(
     * val -> word
     * next -> array(node)/null
     * depth -> int
     * )
     */
    private $root = array(
        'depth' => 0,
        'next' => array(),
    );

    private $matched = array();

    /**
     * Append a keyword to the trie
     *
     * @param string $keyword The keyword to append
     * @return void
     */
    public function append($keyword) {
        $words = preg_split('/(?<!^)(?!$)/u', $keyword);
        array_push($words, '`');
        $this->insert($this->root, $words);
    }

    /**
     * Find all matched keywords in a given string
     *
     * @param string $str The input string
     * @return array An array of matched keywords
     */
    public function match($str) {
        $this->matched = array();
        $words = preg_split('/(?<!^)(?!$)/u', $str);

        while (count($words) > 0) {
            $matched = array();
            $res = $this->query($this->root, $words, $matched);
            if ($res) {
                $this->matched[] = implode('', $matched);
            }
            array_shift($words);
        }

        return $this->matched;
    }

    /**
     * Insert a word into the trie
     *
     * @param array $node The current node in the trie
     * @param array $words The remaining words to be inserted
     * @return void
     */
    private function insert(&$node, $words) {
        if (empty($words)) {
            return;
        }
        $word = array_shift($words);
        if (isset($node['next'][$word])) {
            $this->insert($node['next'][$word], $words);
        } else {
            $tmp_node = array(
                'depth' => $node['depth'] + 1,
                'next' => array(),
            );
            $node['next'][$word] = $tmp_node;
            $this->insert($node['next'][$word], $words);
        }
    }

    /**
     * Search for a word in the trie
     *
     * @param array $node The current node in the trie
     * @param array $words The remaining words to be searched
     * @param array $matched The matched words so far
     * @return bool True if a match is found, false otherwise
     */
    private function query($node, $words, &$matched) {
        $word = array_shift($words);
        if (isset($node['next'][$word])) {
            array_push($matched, $word);
            if (isset($node['next'][$word]['next']['`'])) {
                return true;
            }
            return $this->query($node['next'][$word], $words, $matched);
        } else {
            $matched = array();
            return false;
        }
    }
}