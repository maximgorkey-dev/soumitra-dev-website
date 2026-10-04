// pattrace.hpp: optional events that let the patterns app animate your own run.
//
//   TRACE_NEW(this, "Card")            a box appears
//   TRACE_CALL(from, to, "pay(510)")   a message travels from one box to another
//   TRACE_DEL(this)                    the box is greyed out
//
// Objects are named by pointer, so `this` is the usual argument. A string
// such as "main" names something that isn't an object. Labels may be
// std::string, so "pay(" + std::to_string(n) + ")" works.
//
// Each event is one line on stdout starting with the ASCII record separator
// (0x1E). It goes through the same stream as printf and std::cout, so events
// and printed lines stay in order; the app takes the event lines out before
// comparing your output with the animation.
#pragma once

#include <cstdio>
#include <string>

namespace pattrace {

inline std::string key(const void* p) {
    char buf[32];
    std::snprintf(buf, sizeof buf, "%p", p);
    return buf;
}
inline std::string key(const char* name) { return name; }
inline std::string key(const std::string& name) { return name; }

inline std::string quote(const std::string& s) {
    std::string out = "\"";
    for (unsigned char c : s) {
        if (c == '"' || c == '\\') {
            out += '\\';
            out += static_cast<char>(c);
        } else if (c < 0x20) {
            char b[8];
            std::snprintf(b, sizeof b, "\\u%04x", c);
            out += b;
        } else {
            out += static_cast<char>(c);
        }
    }
    return out + "\"";
}

inline void emit(const char* ev, const std::string& id, const std::string& to, const std::string& label) {
    std::printf("\x1e{\"ev\":\"%s\",\"id\":%s,\"to\":%s,\"label\":%s}\n",
                ev, quote(id).c_str(), quote(to).c_str(), quote(label).c_str());
}

}  // namespace pattrace

#define TRACE_NEW(obj, label)       ::pattrace::emit("new", ::pattrace::key(obj), "", (label))
#define TRACE_CALL(from, to, label) ::pattrace::emit("call", ::pattrace::key(from), ::pattrace::key(to), (label))
#define TRACE_DEL(obj)              ::pattrace::emit("del", ::pattrace::key(obj), "", "")
