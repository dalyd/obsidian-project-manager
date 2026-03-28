<%* let projectName = tp.file.title; if (tp.file.folder(true) === "Projects/Active") { const name = await tp.system.prompt("Project name"); if (name) { projectName = name; await tp.file.rename(name); await tp.file.move("Projects/Active/" + name + "/" + name); } } _%>
---
type: project
Status: Not started
created date: <% tp.date.now("YYYY-MM-DDTHH:mm") %>
---
# Summary
> [!question] What are you trying to achieve with this project

# [[<% projectName %>]]

# Inbox
```dataview
LIST from [[]] and !"Logs" and !outgoing([[]])
where type != "log" AND type != "subproject"
sort file.ctime desc
```

# Subprojects
```dataview
LIST WHERE file.folder = this.file.folder AND type = "subproject" AND file.path != this.file.path SORT file.name ASC
```

# References

# Logs
```dataview
list from [[]]
where type = "log"
sort file.ctime desc
```
