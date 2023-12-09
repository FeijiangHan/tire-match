#include <emscripten.h>
#include <string>
#include <unordered_map>
#include <vector>

class TrieNode {
public:
    std::unordered_map<char, TrieNode*> children;
    bool isEndOfWord;

    TrieNode() : isEndOfWord(false) {}
};

class Trie {
private:
    TrieNode* root;

public:
    Trie() {
        root = new TrieNode();
    }

    void insert(const std::string& word) {
        TrieNode* curr = root;
        for (char c : word) {
            if (curr->children.find(c) == curr->children.end()) {
                curr->children[c] = new TrieNode();
            }
            curr = curr->children[c];
        }
        curr->isEndOfWord = true;
    }

    bool search(const std::string& word) {
        TrieNode* curr = root;
        for (char c : word) {
            if (curr->children.find(c) == curr->children.end()) {
                return false;
            }
            curr = curr->children[c];
        }
        return curr->isEndOfWord;
    }

    std::vector<std::string> searchPrefix(const std::string& prefix) {
        std::vector<std::string> result;
        TrieNode* curr = root;
        for (char c : prefix) {
            if (curr->children.find(c) == curr->children.end()) {
                return result;
            }
            curr = curr->children[c];
        }
        traverse(curr, prefix, result);
        return result;
    }

    void traverse(TrieNode* node, const std::string& prefix, std::vector<std::string>& result) {
        if (node->isEndOfWord) {
            result.push_back(prefix);
        }
        for (auto it = node->children.begin(); it != node->children.end(); ++it) {
            traverse(it->second, prefix + it->first, result);
        }
    }
};

extern "C" {

Trie* createTrie() {
    return new Trie();
}

void destroyTrie(Trie* trie) {
    delete trie;
}

void trieInsert(Trie* trie, const char* word) {
    trie->insert(std::string(word));
}

bool trieSearch(Trie* trie, const char* word) {
    return trie->search(std::string(word));
}

char** trieSearchPrefix(Trie* trie, const char* prefix, int* count) {
    std::vector<std::string> result = trie->searchPrefix(std::string(prefix));
    *count = result.size();

    char** strArray = new char*[*count];
    for (int i = 0; i < *count; i++) {
        strArray[i] = new char[result[i].size() + 1];
        std::strcpy(strArray[i], result[i].c_str());
    }

    return strArray;
}

void freeStringArray(char** strArray, int count) {
    for (int i = 0; i < count; i++) {
        delete[] strArray[i];
    }
    delete[] strArray;
}

}