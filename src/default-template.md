---
type: project
Status: active
created date: <% tp.date.now("YYYY-MM-DDTHH:mm") %>
---
# Summary
> [!question] What are you trying to achieve with this project

# [[<% tp.file.title %>]]

# Inbox
```dataview
LIST from [[]] and !"Logs" and !outgoing([[]])
where type != "log" AND type != "subproject"
sort file.ctime desc
```

# Subprojects
```dataview
LIST FROM this.file.folder WHERE type = "subproject" AND file.path != this.file.path SORT file.name ASC
```

# References

# Logs
```dataview
list from [[]]
where type = "log"
sort file.ctime desc
```
