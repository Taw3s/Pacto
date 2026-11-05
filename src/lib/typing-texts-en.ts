// Texts for the typing test's "Texto" mode, in English: the same subjects as the Portuguese ones.
// Loaded only when the test opens (see loadTypingTexts in typing-texts.ts). Prose only, no code
// symbols; a text's id is stored in typing_progress, so never rename one. English ids start with
// "en-" (the database checks it).
import type { TypingText } from "./typing-texts";

const EN: Omit<TypingText, "lang">[] = [
  {
    id: "en-algorithm",
    category: "Fundamentos",
    title: "What is an algorithm",
    text:
      "An algorithm is a finite sequence of well defined steps that solves a problem. A cake recipe is an algorithm: it has " +
      "ingredients as input, instructions in order and a result at the end. In programming the idea is the same, but the steps " +
      "must be so precise that a machine can follow them without interpreting anything. A good algorithm always finishes, gives " +
      "the right answer for every valid input and uses no more time or memory than it needs. That is why two algorithms can solve " +
      "the same problem and still be very different. Looking for a name in a list by checking every item works, but in a sorted " +
      "list it is much faster to open the middle and throw away half of the list at each step. This is called binary search, and " +
      "it shows that thinking before writing code is often worth more than typing fast.",
  },
  {
    id: "en-variables",
    category: "Fundamentos",
    title: "Variables and types",
    text:
      "A variable is a name that points to a value stored in memory. Instead of repeating a number in many places, a program keeps " +
      "it once and uses the name whenever it needs it. Every value has a type, which says what it represents and what can be done " +
      "with it. Whole numbers can be added, pieces of text can be joined, and boolean values are only true or false. Some languages " +
      "require the type of every variable to be declared and check everything before the program runs; others find out the types " +
      "while the program is running. The first approach catches many mistakes early, while the second lets you write code faster. " +
      "Choosing good names for variables looks like a small detail, but it is one of the things that most help code stay easy to " +
      "read months later.",
  },
  {
    id: "en-functions",
    category: "Fundamentos",
    title: "Functions",
    text:
      "A function is a named block of code that receives data, does some work and returns a result. It exists to avoid repetition " +
      "and to give a name to an idea. When the same shipping calculation appears on three screens, writing it once inside a function " +
      "makes sure all three screens change together when the rule changes. The values a function receives are called parameters. A " +
      "pure function always returns the same output for the same inputs and changes nothing outside of itself, which makes it easy " +
      "to test and to understand. Small functions that do only one thing are usually easier to reuse. When the name of a function " +
      "needs the word and in the middle to describe what it does, that is a good sign it should be split into two.",
  },
  {
    id: "en-complexity",
    category: "Fundamentos",
    title: "Algorithm complexity",
    text:
      "The complexity of an algorithm describes how the time or memory it needs grows as the input grows. It does not matter " +
      "whether a list of ten items takes one or two milliseconds; what matters is what happens with a million items. A linear " +
      "algorithm does work in proportion to the size of the input. A quadratic one, such as comparing every item with every other " +
      "item, becomes a hundred times slower when the input becomes ten times larger. Binary search is logarithmic: doubling the " +
      "list adds only one more step. This way of measuring ignores the details of the machine and focuses on the shape of the " +
      "growth, which is why it is called asymptotic analysis. In practice it helps you notice early when a solution that works well " +
      "in tests will freeze once real data arrives.",
  },
  {
    id: "en-api",
    category: "Fundamentos",
    title: "What is an API",
    text:
      "API stands for application programming interface. It is a contract that says how one program can ask something of another: " +
      "which requests exist, which data to send and what comes back as an answer. When a weather app shows the forecast, it has " +
      "probably asked a weather service for that data through its API. The app does not need to know how the service calculates " +
      "the forecast; it only needs to follow the contract. This separation is what allows different systems, written in different " +
      "languages, to talk to each other. A good API is stable, well documented and hard to use the wrong way. Changing a contract " +
      "that other people already depend on breaks their programs, so public APIs usually get new versions instead of changing the " +
      "old ones.",
  },
  {
    id: "en-http",
    category: "Fundamentos",
    title: "How HTTP works",
    text:
      "HTTP is the protocol a browser uses to talk to servers. Every conversation is a request followed by a response. The request " +
      "says what is wanted by using a method: GET to fetch something, POST to send new data, PUT or PATCH to change it and DELETE " +
      "to remove it. The response carries a status code, such as two hundred when everything went well, four hundred and four when " +
      "the address does not exist and five hundred when the server failed. Requests and responses also carry headers, which are " +
      "extra details like the type of the content or the token of the person who is logged in. HTTP keeps no memory between one " +
      "request and the next, so the server only knows who you are because every request carries that proof. Its secure version, " +
      "HTTPS, encrypts everything along the way.",
  },
  {
    id: "en-git",
    category: "Fundamentos",
    title: "Git and version control",
    text:
      "Git is a version control system: it keeps the history of a project as a series of snapshots called commits. Each commit " +
      "records what changed, who changed it and why, so you can go back in time, compare versions and find out when a bug first " +
      "appeared. Branches are parallel lines of work. Someone can create a branch for a new feature without touching the version " +
      "that is running in production, and only join the two when the work is ready. Joining them is called a merge. When two people " +
      "change the same line, Git does not guess which change wins and asks someone to resolve the conflict. Small commits with clear " +
      "messages turn the history into documentation of how the project got to where it is today.",
  },
  {
    id: "en-compiler-interpreter",
    category: "Fundamentos",
    title: "Compiler and interpreter",
    text:
      "A computer only understands machine instructions, so the code we write has to be translated. A compiler translates the whole " +
      "program at once, before it runs, and produces an executable file. Languages like C, Go and Rust work this way, which is why " +
      "they tend to be fast and to report many errors before the program even starts. An interpreter reads and runs the code bit by " +
      "bit while the program is running, which makes it very quick to try out ideas. In practice the line is blurry. Java is " +
      "compiled into an intermediate code that a virtual machine runs, and the JavaScript engines in browsers compile the most used " +
      "parts of the code while it runs in order to make them faster. The useful question is not whether a language is compiled, but " +
      "when each kind of error will show up.",
  },
  {
    id: "en-cloud",
    category: "Fundamentos",
    title: "What is the cloud",
    text:
      "The cloud means using computers owned by another company over the internet and paying for what you use. Instead of buying servers " +
      "and keeping them running in a room, a team rents capacity from providers that have data centers all over the world. There " +
      "are different levels of service. At the most basic level you rent virtual machines and take care of everything else. With " +
      "managed services, the provider looks after the database, the backups and the updates. In the serverless model you only send " +
      "your code, and it runs whenever someone makes a request. The big advantage is being able to grow or shrink in minutes. The " +
      "risk is the bill: forgotten resources keep costing money, and a badly configured permission can leave data open to anyone.",
  },
  {
    id: "en-passwords",
    category: "Fundamentos",
    title: "How to store passwords",
    text:
      "A system should never store passwords exactly as people typed them. If the database leaks, every account is exposed, and " +
      "since many people reuse passwords, the damage goes far beyond that one site. The right way is to store a hash, the result of " +
      "a one way function: it is easy to compute the hash from the password, but practically impossible to go the other way. At " +
      "login, the system hashes what was typed and compares it with the stored value. Each password also gets a salt, a random " +
      "value that keeps two identical passwords from having the same hash. Functions made for this purpose, such as bcrypt and " +
      "argon2, are slow on purpose, so that trying millions of guesses becomes far too expensive for an attacker.",
  },
  {
    id: "en-sql-what",
    category: "SQL e dados",
    title: "What is SQL",
    text:
      "SQL is the language used to talk to relational databases. In these databases, data lives in tables made of rows and columns, " +
      "much like a well organized spreadsheet. With SQL you describe what you want, not how to find it. For example, asking for all " +
      "students with a grade above seven, sorted by name, is a single statement; the database decides on its own the fastest way to " +
      "find those rows. The most common statements are SELECT to read data, INSERT to add it, UPDATE to change it and DELETE to " +
      "remove it. You can also join different tables in the same query, matching for example each order with the customer who " +
      "placed it. Even with so many new technologies around, SQL is still one of the most useful skills for anyone who works with " +
      "data.",
  },
  {
    id: "en-sql-keys",
    category: "SQL e dados",
    title: "Primary and foreign keys",
    text:
      "Every well designed table has a primary key, a column whose value identifies each row in a unique way. It can be a number " +
      "that grows on its own or a random identifier. Names and email addresses are poor choices, because they change. A foreign key " +
      "is a column that points to the primary key of another table. In an orders table, the customer column holds the identifier of " +
      "someone from the customers table. The database then guarantees that link: it refuses an order for a customer who does not " +
      "exist, and it can either stop a customer with orders from being deleted or delete the orders as well, depending on the rule " +
      "you chose. This guarantee is called referential integrity. It takes the job of keeping data consistent away from the " +
      "application code, because no program can save a broken link.",
  },
  {
    id: "en-sql-indexes",
    category: "SQL e dados",
    title: "Database indexes",
    text:
      "Without an index, to find the rows of one customer the database has to read the entire table, row by row. With a few rows " +
      "that does not matter, but with millions it becomes a problem. An index works like the index at the back of a book: a sorted " +
      "structure that says where each value is, usually organized as a tree that reaches the data in a few steps. Indexes make " +
      "queries much faster, but they are not free. They take up space and must be updated on every insert or change, which makes " +
      "writes a little slower. So the rule is to create indexes for the columns that are used most in filters, joins and sorting, " +
      "and to check the execution plan to make sure the database is really using the index you created.",
  },
  {
    id: "en-sql-transactions",
    category: "SQL e dados",
    title: "Transactions",
    text:
      "A transaction groups several operations into a block that either happens completely or does not happen at all. The classic " +
      "example is a bank transfer: taking money out of one account and putting it into another are two steps, and it would be a " +
      "disaster if only the first one happened because of a power cut. Inside a transaction, if something fails, everything is " +
      "undone with a rollback; if it all works, a commit confirms every change at once. Relational databases promise four " +
      "properties, known by the acronym ACID: atomicity, consistency, isolation and durability. Isolation is the most subtle one, " +
      "because it defines what a transaction can see of others running at the same time, and stricter levels bring more safety at " +
      "the cost of performance.",
  },
  {
    id: "en-python-intro",
    category: "Python",
    title: "Why Python is so popular",
    text:
      "Python is a language created by Guido van Rossum and first released in nineteen ninety one. It became famous for being easy " +
      "to read: blocks of code are defined by indentation instead of symbols, which forces the code to look organized. Python is " +
      "interpreted and dynamically typed, so you can try ideas quickly in the terminal. Its greatest strength is its ecosystem. " +
      "There are ready made libraries for data analysis, machine learning, task automation, web development and scientific " +
      "computing. That is why the same language is used by scientists, analysts and software engineers. The philosophy of the " +
      "language says that there should be one obvious way to do each thing, and that readability counts. The price of this " +
      "simplicity is speed, which is lower than in compiled languages.",
  },
  {
    id: "en-python-collections",
    category: "Python",
    title: "Lists and dictionaries in Python",
    text:
      "In Python, the two most used data structures are the list and the dictionary. A list keeps items in order and lets you reach " +
      "them by position, starting from zero. It can grow, shrink and mix different types, and it is ideal when order matters. A " +
      "dictionary keeps pairs of keys and values, like a name linked to a phone number. Looking up a value by its key is very fast, " +
      "even with millions of items, because the dictionary uses a hash table underneath. Python also offers tuples, which are lists " +
      "that cannot be changed, and sets, which keep items without repetition. Choosing the right structure changes everything: " +
      "checking whether a name is in a list means looking at every item, while in a set the answer comes almost instantly.",
  },
  {
    id: "en-js-intro",
    category: "JavaScript",
    title: "The story of JavaScript",
    text:
      "JavaScript was created in nineteen ninety five by Brendan Eich, in about ten days, to make pages in the Netscape browser " +
      "interactive. Despite its name, it has nothing to do with Java; the name was a marketing move of the time. Today it is the " +
      "only language that every browser runs natively, which is why it is on almost every website. With Node.js it also runs on " +
      "servers, so a single team can write both ends of an application. The language is standardized under the name ECMAScript and " +
      "gets new features every year. Many projects use TypeScript, which adds types to JavaScript and reports errors before the code " +
      "runs, without changing what happens in the browser.",
  },
  {
    id: "en-js-async",
    category: "JavaScript",
    title: "Asynchronous JavaScript",
    text:
      "JavaScript runs one thing at a time, on a single thread. If every request to the internet stopped the program until the " +
      "answer arrived, the page would freeze. The solution is the asynchronous model. When the code asks for something slow, such " +
      "as data from a server, it registers what to do when the answer arrives and moves on. A mechanism called the event loop keeps " +
      "checking which tasks have finished and runs the next part of each one. Promises represent a value that will exist later, and " +
      "the words async and await let you write this flow as if it were a normal sequence, from top to bottom. The most common " +
      "mistake beginners make is forgetting to wait for a promise and using a result that has not arrived yet.",
  },
  {
    id: "en-html-css",
    category: "Web",
    title: "HTML and CSS",
    text:
      "Every web page starts with HTML, the language that describes the structure of the content: what is a heading, what is a " +
      "paragraph, where there is a list, an image or a button. HTML is not a programming language, because it has no logic or " +
      "decisions; it marks the meaning of each part. Using the right markup matters, because screen readers and search engines " +
      "depend on it to understand the page. CSS takes care of how things look: colors, fonts, spacing and the layout of elements on " +
      "the screen. Keeping structure apart from style lets you change the look of a whole site without touching the content. With " +
      "tools like flexbox and grid, and rules that change with the width of the screen, the same HTML adapts to a phone and to a " +
      "large monitor.",
  },
  {
    id: "en-web-browser",
    category: "Web",
    title: "What happens when you open a site",
    text:
      "When you type an address and press enter, a lot happens in less than a second. First, the browser asks the DNS for the " +
      "numeric address of the server behind that name. Then it opens a connection to it and, if the site uses HTTPS, the two agree " +
      "on a key to encrypt the conversation. Next the browser asks for the page, and the server answers with the HTML. While " +
      "reading that HTML, the browser finds out it needs other files, such as styles, scripts and images, and asks for each of " +
      "them. With everything in hand, it builds the tree of elements, works out where each thing goes and paints the screen. That " +
      "is why fast sites care about sending fewer and smaller files, and about showing the main content before everything else.",
  },
  {
    id: "en-networks",
    category: "Fundamentos",
    title: "How computers talk to each other",
    text:
      "For two computers to exchange data over the internet, the message is split into small packets. Each packet carries the " +
      "IP address of its source and its destination, like an envelope with a sender and a recipient. Routers read that address " +
      "and pass the packet along, through paths that can change during the trip, until it reaches the right computer. On top of " +
      "IP runs TCP, which numbers the packets, checks that all of them arrived, asks again for the lost ones and delivers " +
      "everything in the correct order. When speed matters more than guarantees, as in video calls and online games, UDP is " +
      "used instead: it sends without confirming delivery. Inside a single computer, ports tell which program should receive " +
      "each packet. Port four hundred and forty three, for example, is usually the one for HTTPS.",
  },
  {
    id: "en-terminal",
    category: "Fundamentos",
    title: "The terminal and the command line",
    text:
      "The terminal is a window where you talk to the computer through text, typing commands instead of clicking buttons. " +
      "Behind it runs a program called a shell, such as Bash or Zsh, which reads each line and runs the program you asked for. " +
      "It looks old fashioned, but it has huge advantages: a command can be repeated, saved in a script and combined with " +
      "others. The output of one program can become the input of the next, so tasks like searching for a word in a thousand " +
      "files or renaming hundreds of photos become a single line. Almost every cloud server runs Linux without a graphical " +
      "interface, and the only way to manage those machines is through the command line. Tools such as Git, package managers " +
      "and compilers were also born for the terminal. Learning a dozen basic commands already makes a big difference in the " +
      "daily speed of anyone who writes code.",
  },
  {
    id: "en-testing",
    category: "Fundamentos",
    title: "Automated tests",
    text:
      "An automated test is a small program that checks whether another program does what it should. Instead of opening the app " +
      "and clicking on everything after each change, you write down once what you expect, and the computer checks it in " +
      "seconds. Unit tests check a single function in isolation, with known inputs and outputs. Integration tests check that " +
      "several parts work together, such as the code and the database. End to end tests simulate a person using the real " +
      "system, in a browser. The higher the level, the more confidence a test gives, and the slower and more fragile it tends " +
      "to be. The real value of tests shows up months later, when someone changes one part of the code and finds out right away " +
      "that it broke another. Without them, every change becomes a bet, and the fear of touching anything leaves the project " +
      "stuck.",
  },
  {
    id: "en-injection",
    category: "Fundamentos",
    title: "Injection and user input",
    text:
      "One of the oldest and still most common security flaws is injection. It happens when a program glues text typed by a " +
      "user directly into a command, such as a database query. If someone types, instead of a name, a carefully crafted piece " +
      "of SQL, the database may run that piece as part of the original query and return or delete data it never should. The " +
      "defense is to never build commands by pasting text together. Libraries offer parameterized queries, in which the command " +
      "and the values travel separately, and the database always treats a value as data, never as an instruction. The same idea " +
      "applies to web pages: text that comes from users must be escaped before it is shown on screen, or it becomes code " +
      "running in the browsers of other people. The general rule is simple: every outside input is suspicious until it has been " +
      "validated.",
  },
  {
    id: "en-sql-joins",
    category: "SQL e dados",
    title: "Combining tables with JOIN",
    text:
      "In a relational database, information is split across tables so it is not repeated. Customers live in one table, orders " +
      "in another, and each order stores only the identifier of its customer. To see the name of the customer next to each " +
      "order, you use a JOIN, which combines rows from different tables based on a condition, usually the equality between the " +
      "foreign key and the primary key. An INNER JOIN returns only the combinations that exist on both sides: orders without a " +
      "customer and customers without orders are left out. A LEFT JOIN keeps every row of the left table and fills in null " +
      "where there is no match, which is useful to find, for example, customers who never bought anything. There is also the " +
      "FULL JOIN, which keeps everything from both sides. Picking the wrong kind of join is one of the most common causes of " +
      "reports with missing numbers.",
  },
  {
    id: "en-sql-group-by",
    category: "SQL e dados",
    title: "Summarizing with GROUP BY",
    text:
      "Many questions about data do not ask for individual rows but for summaries: how much each customer spent this month, how " +
      "many orders went out per day, what the average grade of each class is. That is what GROUP BY is for. It gathers the rows " +
      "that share the same value in one or more columns and lets you apply aggregate functions to each group, such as COUNT to " +
      "count, SUM to add, AVG for the average and MAX or MIN for the extremes. One important rule: every column in the result " +
      "must be part of the grouping or sit inside an aggregate function, because otherwise the database would not know which " +
      "value to show. To filter rows before grouping, you use WHERE. To filter the groups after they are computed, such as " +
      "showing only customers with more than five orders, you use HAVING. Mixing up the two is a classic beginner mistake.",
  },
  {
    id: "en-sql-subqueries",
    category: "SQL e dados",
    title: "Subqueries and CTEs",
    text:
      "A subquery is a query inside another query. It lets you answer questions in steps, such as listing the products priced " +
      "above the average: first the average is computed, then each product is compared with it. Subqueries can appear in a " +
      "filter, in place of a table or even in place of a single value. When the logic grows, several nested subqueries become " +
      "hard to read. That is why common table expressions exist, known as CTEs and written with the word WITH. They give a name " +
      "to each step at the top of the query, and the final part uses those names as if they were tables. The result is usually " +
      "the same, but the reading goes from top to bottom, like a recipe. Some databases also accept recursive CTEs, which are " +
      "useful to walk through hierarchies, such as the categories of a store or the chart of a company.",
  },
  {
    id: "en-sql-normalization",
    category: "SQL e dados",
    title: "Data normalization",
    text:
      "Normalizing a database means organizing its tables so that each piece of information is stored in a single place. " +
      "Imagine a sheet of orders that repeats the address of the customer on every row. If the customer moves, dozens of rows " +
      "must be changed, and forgetting just one leaves the data contradicting itself. In the normalized version, the address " +
      "lives in the customers table and the orders only point to the customer. The normal forms are rules that describe this " +
      "process in levels: each column holds a single value, each piece of information depends on the whole key, and no column " +
      "depends on another column that is not the key. Normalizing too much, however, forces every query to join many tables. In " +
      "reporting systems it is common to go the other way on purpose, repeating some data to make reads faster.",
  },
  {
    id: "en-sql-null",
    category: "SQL e dados",
    title: "The null value",
    text:
      "In SQL, null is not zero and not an empty string: it means the value is unknown or does not exist. That difference has " +
      "consequences that surprise a lot of people. Any comparison with null also results in unknown, not true and not false. " +
      "That is why a filter asking whether a column equals null never finds anything; the right way is to use IS NULL or IS NOT " +
      "NULL. Adding a number to null results in null. Aggregate functions, such as the average, simply ignore nulls, which can " +
      "change a result without any warning. To replace a null with a default value when displaying it, there is the COALESCE " +
      "function. When designing a table, it pays to decide carefully which columns may be left empty and to mark the others as " +
      "required, letting the database itself refuse incomplete data.",
  },
  {
    id: "en-sql-nosql",
    category: "SQL e dados",
    title: "Relational or NoSQL",
    text:
      "Relational databases store data in tables with defined columns and relationships guaranteed by keys. Databases called " +
      "NoSQL give up part of those rules in exchange for other advantages. Document databases store each record as a flexible " +
      "document that can have fields different from the others. Key value stores work like a giant dictionary and are extremely " +
      "fast for simple reads, which is why they are often used as a cache. There are also graph databases, built for complex " +
      "relationships such as social networks. The choice depends on the problem, not on fashion. When the data has many " +
      "relationships and needs consistency, as in a financial system, a relational database is usually the best option. When " +
      "the format changes all the time, or the volume is huge and the queries are simple, NoSQL can be more practical. Many " +
      "systems use both at the same time.",
  },
  {
    id: "en-python-functions",
    category: "Python",
    title: "Functions in Python",
    text:
      "In Python, a function is created with the word def, followed by its name and parameters, and its body is defined by " +
      "indentation. Parameters can have default values, which lets you call the function with fewer arguments. You can also " +
      "pass arguments by name, which makes a call clearer when there are many parameters. A function can return several values " +
      "at once, which arrive together in a tuple. In Python, functions are objects like any other: they can be stored in " +
      "variables, passed to other functions and returned as results. That is what makes decorators possible, functions that " +
      "wrap other functions to add behavior, such as timing them or checking permissions. A classic pitfall: never use an empty " +
      "list as the default value of a parameter, because it is created only once and then shared by every call of the function.",
  },
  {
    id: "en-python-classes",
    category: "Python",
    title: "Classes and objects in Python",
    text:
      "A class is a template for creating objects that bundle data and behavior together. In Python, the special init method is " +
      "called when an object is born and usually sets up its attributes. Every method receives the object itself as its first " +
      "parameter, by convention called self, and attributes are reached through it. A class can inherit from another and reuse " +
      "its methods, changing only what needs to be different. Python also has special methods, with two underscores before and " +
      "after the name, that let your own objects behave like built in types: they can be added, compared, printed in a readable " +
      "way or looped over. For classes that only hold data, the dataclasses module automatically generates the constructor and " +
      "the comparison. Even so, not everything in Python needs to be a class: very often a plain function is the better answer.",
  },
  {
    id: "en-python-comprehensions",
    category: "Python",
    title: "List comprehensions",
    text:
      "List comprehensions are one of the trademarks of Python. They build a new list from another one in a single expression, " +
      "describing what to do with each item and, optionally, which items to keep. For example, you can produce the squares of " +
      "the even numbers in a list in one short and readable line, without declaring an empty list and filling it inside a loop. " +
      "The same idea works for dictionaries and sets. When the comprehension is written with parentheses instead of square " +
      "brackets, it becomes a generator: values are produced one at a time, on demand, without filling memory with the whole " +
      "list. That makes a difference when processing huge files. The limit is readability: comprehensions with several " +
      "conditions and nested loops become hard to understand, and in that case a regular loop is the more honest choice.",
  },
  {
    id: "en-python-venv",
    category: "Python",
    title: "Virtual environments and pip",
    text:
      "Different projects often need different versions of the same libraries. If everything is installed into the system " +
      "Python, sooner or later one project breaks another. The solution is a virtual environment: a folder with an isolated " +
      "Python and its own libraries, created by the venv module. Once it is activated, everything you install goes inside it. " +
      "Libraries are installed with pip, which fetches packages from the public repository called PyPI. So that someone else " +
      "can recreate the same environment, the dependencies and their versions are written down in a file, traditionally a " +
      "requirements file, or in the more modern pyproject file. Newer tools, such as Poetry and uv, automate the whole process " +
      "and lock the exact versions. The virtual environment folder does not go into Git: whoever clones the project creates " +
      "their own.",
  },
  {
    id: "en-python-exceptions",
    category: "Python",
    title: "Handling errors in Python",
    text:
      "When something goes wrong while a program runs, such as opening a file that does not exist or dividing by zero, Python " +
      "raises an exception. If nobody handles it, the program stops and shows the chain of calls that led to the error, the " +
      "traceback, which is the first thing to read when debugging. To handle it, you use try: the risky code goes inside the " +
      "block, and except defines what to do if a specific exception happens. There is also else, which runs when nothing " +
      "failed, and finally, which always runs and is ideal for releasing resources. A good practice is to catch only the errors " +
      "you know how to fix, and never to swallow every exception silently, because that hides bugs. For files and connections, " +
      "the with statement guarantees they are closed automatically, even when an error happens halfway through.",
  },
  {
    id: "en-python-pandas",
    category: "Python",
    title: "Data analysis with pandas",
    text:
      "pandas is the most widely used library for analyzing data in Python. Its main structure is the DataFrame, a table with " +
      "named rows and columns, similar to a spreadsheet but driven by code. In a few lines you can read a CSV file or a " +
      "spreadsheet, filter rows by a condition, create calculated columns, group and summarize values, join tables and export " +
      "the result. Under the hood, pandas uses NumPy, which stores numbers in contiguous blocks of memory and does the math in " +
      "compiled code, so operations on whole columns are far faster than loops written by hand. The golden rule is to think in " +
      "columns, not rows: apply an operation to the entire column at once. For truly large data sets that do not fit in memory, " +
      "there are alternatives such as Polars and DuckDB.",
  },
  {
    id: "en-js-closures",
    category: "JavaScript",
    title: "Scope and closures",
    text:
      "In JavaScript, every function remembers the place where it was created. If a function is defined inside another one, it " +
      "keeps access to the variables of the outer function even after that function has finished. This mechanism is called a " +
      "closure. It is used all the time, often without anyone noticing: in functions that keep a private counter, in event " +
      "handlers that need data from the page and in functions built to order from a configuration. Scope also explains the " +
      "difference between var, let and const. Variables declared with var belong to the whole function, which caused famous " +
      "bugs inside loops. Variables declared with let and const belong only to the block where they were declared, and const " +
      "prevents the variable from being reassigned. Today, the general advice is to use const whenever possible and let when " +
      "the value has to change.",
  },
  {
    id: "en-js-dom",
    category: "JavaScript",
    title: "The DOM and events",
    text:
      "When the browser reads a page, it turns the HTML into a tree of objects called the DOM. JavaScript talks to the page " +
      "through that tree: it can find elements, change text, swap styles, and create or remove parts of the screen. " +
      "Interactivity comes from events. A click, a key press, a submitted form or an image that finished loading all produce " +
      "events, and the code registers functions to react to each of them. Events bubble up the tree, from the clicked element " +
      "to the root, which lets you handle the clicks of a whole list with a single listener on the parent element. Changing the " +
      "DOM has a cost, because the browser may need to recompute the layout. That is why libraries such as React keep a " +
      "representation of the screen in memory and apply only the necessary differences to the DOM.",
  },
  {
    id: "en-web-rest",
    category: "Web",
    title: "REST APIs",
    text:
      "REST is a style of building web APIs that takes advantage of HTTP itself. Each thing in the system, such as a user or an " +
      "order, is a resource with its own address. Actions are expressed by the methods of HTTP: GET to read, POST to create, " +
      "PUT or PATCH to change and DELETE to remove. Responses use status codes consistently and, most of the time, carry their " +
      "data as JSON, a simple text format that every language understands. A central idea is not to keep conversation state on " +
      "the server: each request carries everything it needs, including proof of who is asking. That makes it easier to spread " +
      "the system across many machines. REST is not the only option. GraphQL lets the client ask for exactly the fields it " +
      "wants, and gRPC exchanges binary messages, which are faster, between internal services.",
  },
  {
    id: "en-web-react",
    category: "Web",
    title: "Components with React",
    text:
      "React is a library for building interfaces out of components: small reusable pieces, such as a button, a card or a list, " +
      "which together make up the whole screen. Each component is a function that receives data, called props, and describes " +
      "what should appear. When a component needs to remember something that changes, such as the text typed into a field, it " +
      "uses state. The big idea of React is that you do not change the screen directly: you describe how it should look for a " +
      "given state, and the library works out what to update when the state changes. That makes the code more predictable. On " +
      "top of React came frameworks such as Next.js, which add routing, server rendering and the other pieces a complete site " +
      "needs. Pacto itself was built with Next.js.",
  },
  {
    id: "en-ts-intro",
    category: "TypeScript",
    title: "What is TypeScript",
    text:
      "TypeScript is JavaScript with types. It was created by Microsoft and released in two thousand and twelve, and every " +
      "valid piece of JavaScript is also valid TypeScript. The difference is that you can say, for example, that a function " +
      "takes a number and returns a string, and the compiler checks that contract across the whole project before the code " +
      "runs. If someone calls the function with the wrong type, the error shows up in the editor while you type, not in the " +
      "hands of a user. Types exist only while writing: the compiler removes them and produces plain JavaScript, which runs in " +
      "the browser or in Node.js. That is why TypeScript makes a program neither faster nor slower. The gain is in maintenance: " +
      "renaming something, changing the shape of some data or understanding old code becomes much safer when the editor knows " +
      "the type of everything.",
  },
  {
    id: "en-ts-basic-types",
    category: "TypeScript",
    title: "Basic types in TypeScript",
    text:
      "The simplest types in TypeScript match the values of JavaScript: string for text, number for numbers and boolean for " +
      "true or false. Arrays are described by the type of their items, such as an array of numbers. Objects are described by " +
      "their shape, saying which properties exist and the type of each one, and a property can be marked as optional. Two " +
      "special types deserve attention. The type any switches checking off: it accepts anything and allows any operation, which " +
      "cancels out the point of using TypeScript. The type unknown also accepts any value, but forces you to check what it is " +
      "before using it, which makes it the safe choice for data that comes from outside, such as the response of an API. There " +
      "is also never, the type of something that can never happen, which is useful to make sure every case of a choice was " +
      "handled.",
  },
  {
    id: "en-ts-interfaces",
    category: "TypeScript",
    title: "Interface or type",
    text:
      "In TypeScript there are two main ways to name the shape of an object: interface and type. In most cases they do the same " +
      "thing, and the choice is a matter of project style. Some differences do exist. An interface can be declared again " +
      "somewhere else, and the declarations add up, which is useful to extend the types of libraries. An interface can also " +
      "extend another one explicitly, like inheritance of shapes. A type alias is more general: besides objects, it can name " +
      "unions, tuples, function types and combinations of other types. An important point is that TypeScript checks types " +
      "structurally: what matters is the shape, not the name. If an object has every required property, it is accepted, even if " +
      "it was created with no relationship at all to that type.",
  },
  {
    id: "en-ts-unions",
    category: "TypeScript",
    title: "Unions and narrowing",
    text:
      "A union says that a value can be of one type or another, such as an identifier that can be a number or a string. Unions " +
      "of literal values are even more useful: the status of an order can be only pending, paid or cancelled, and any other " +
      "text becomes a compile error. To use a value of a union type, the code has to find out which of the types it holds at " +
      "that moment. TypeScript follows those checks and narrows the type automatically, a process called narrowing. After " +
      "checking that a value is a string, inside that block the editor already offers string methods. A powerful pattern is the " +
      "discriminated union: several object shapes that share a property with different values, such as a field named kind. " +
      "Checking that field is enough for the compiler to know exactly which other properties exist in that case.",
  },
  {
    id: "en-ts-generics",
    category: "TypeScript",
    title: "Generics",
    text:
      "Generics let you write code that works with many types without losing track of which type is being used. Think of a " +
      "function that returns the first item of an array. Without generics, it would have to accept anything and return " +
      "anything, and the type of the result would be lost. With a type parameter, the function says: I take an array of some " +
      "type and return an item of that same type. The caller does not need to state anything, because TypeScript infers the " +
      "type from the argument. Generics can also have constraints, requiring, for example, that the type has a property named " +
      "id. The most common structures of everyday code are generic: arrays, promises, maps and the typed responses of request " +
      "libraries. Understanding generics is the step that separates people who only use types from people who can design good " +
      "ones.",
  },
  {
    id: "en-ts-strict",
    category: "TypeScript",
    title: "Strict mode",
    text:
      "TypeScript can be more or less demanding, and the strict option turns on a whole set of stricter checks at once. The " +
      "most important one deals with null and undefined values. Without it, any variable can silently be null, and the classic " +
      "error of reading a property of something that does not exist only shows up while the program runs. In strict mode, a " +
      "type must say explicitly that a value can be missing, and the compiler forces you to handle that case before using it. " +
      "Strict mode also complains about parameters without a type, which would otherwise become any without anyone noticing, " +
      "and checks the types of functions passed as arguments more carefully. In new projects, the advice is to turn strict on " +
      "from day one. In older projects, the checks can be enabled gradually, fixing one part of the code at a time.",
  },
  {
    id: "en-ts-inference",
    category: "TypeScript",
    title: "Type inference",
    text:
      "Nobody has to write down the type of every variable in TypeScript. The compiler looks at the assigned value and works " +
      "out the type by itself, a process called inference. If a variable receives a number, it is a number; if a function " +
      "always returns a string, its return type is string. Inference also works the other way around: when you pass a function " +
      "as an argument, its parameters receive the type that the caller expects. In practice, the advice is to annotate the " +
      "edges of the code, such as the parameters of exported functions and the data that comes from outside, and to let " +
      "inference handle the rest. Annotating too much clutters the code and can even get in the way, because a type written by " +
      "hand is sometimes wider than the one the compiler would have inferred. Hovering over a variable in the editor shows the " +
      "inferred type.",
  },
  {
    id: "en-ts-literals",
    category: "TypeScript",
    title: "Literal types and enums",
    text:
      "Besides saying that a value is a string, TypeScript lets you say exactly which string. A literal type accepts only that " +
      "value, and unions of literals create closed sets of options, such as the directions north, south, east and west. People " +
      "coming from other languages often reach for an enum first, which TypeScript also has. The difference is that an enum " +
      "produces real JavaScript code, an object that exists at runtime, while unions of literals disappear when compiled and " +
      "weigh nothing. That is why many modern projects prefer unions of literals and keep constant objects for when they need " +
      "to loop over the options. With the as const expression, an object or an array is frozen at the type level, and the union " +
      "of its values can be derived directly from it, without writing the options twice.",
  },
  {
    id: "en-ts-tsconfig",
    category: "TypeScript",
    title: "Compiling with tsconfig",
    text:
      "A TypeScript project is configured by a file called tsconfig. It says which files belong to the project, which version " +
      "of JavaScript the code should be converted to, which kind of modules to use and which checks to turn on. The official " +
      "compiler is tsc, which checks the types and produces the JavaScript files. In many current projects, however, the code " +
      "is converted by faster tools such as esbuild, SWC or the bundler of the framework, which only strip the types without " +
      "checking them. In that setup, tsc is still used, but only to check types, usually in a continuous integration step. " +
      "Another important piece is declaration files, which describe the types of libraries written in plain JavaScript. Many " +
      "packages ship their own, and the rest usually have declarations maintained by the community.",
  },
  {
    id: "en-ts-utility-types",
    category: "TypeScript",
    title: "Utility types",
    text:
      "TypeScript ships with a collection of ready made types that transform other types. Partial makes every property of an " +
      "object optional, which is handy for update functions that receive only the changed fields. Required does the opposite. " +
      "Pick builds a new type with only a few chosen properties, and Omit builds a type without the listed properties. Readonly " +
      "prevents properties from being changed. Record describes an object used as a dictionary, with keys of one type and " +
      "values of another. ReturnType extracts the type returned by a function, which avoids repeating the same shape in two " +
      "places. The advantage of these utilities is keeping a single source of truth: when the original type changes, every " +
      "derived type changes with it, and the compiler points to each place in the code that needs to be updated.",
  },
  {
    id: "en-java-jvm",
    category: "Java",
    title: "Java and the JVM",
    text:
      "Java was released in nineteen ninety five with a promise: write once, run anywhere. To keep it, Java code is not " +
      "compiled straight to the processor. The compiler produces an intermediate code, the bytecode, which runs inside the JVM, " +
      "the Java virtual machine. There is a JVM for each system, and the same bytecode works on all of them. While running, the " +
      "JVM watches which parts are used the most and compiles them to machine code, a technique called just in time " +
      "compilation, which makes Java very fast in programs that run for a long time, such as servers. Other languages also run " +
      "on the JVM, such as Kotlin and Scala, and they can use the same libraries. That is why learning how the JVM works pays " +
      "off across this whole ecosystem, which powers a large share of the systems of banks and big companies.",
  },
  {
    id: "en-java-classes",
    category: "Java",
    title: "Classes and objects in Java",
    text:
      "In Java, almost all code lives inside classes. A class defines fields, which hold state, and methods, which define " +
      "behavior. Each object created from the class has its own field values. Constructors set up the object at the moment it " +
      "is created. Access modifiers control who can see each part: private hides it inside the class itself, public opens it to " +
      "everyone, and protected opens it to subclasses. The common practice is to keep fields private and offer methods to read " +
      "or change them, which allows the values to be validated and the implementation to change without breaking the code that " +
      "uses the class. This principle is called encapsulation. In recent versions, Java gained records, compact classes for " +
      "holding immutable data, which automatically generate the constructor, the comparison and the text representation.",
  },
  {
    id: "en-java-inheritance",
    category: "Java",
    title: "Inheritance and interfaces",
    text:
      "In Java, a class can inherit from just one other class, reusing its fields and methods and overriding whatever needs to " +
      "be different. To express abilities shared by classes that are not related, there are interfaces. An interface declares " +
      "methods that a class promises to have, such as being comparable or being closeable, and a class can implement as many " +
      "interfaces as it wants. That enables polymorphism: a method that receives an interface works with any object that " +
      "implements it, without knowing its real class. Abstract classes sit halfway, with part of the implementation ready and " +
      "part left to the subclasses. Over time, the community learned that deep inheritance hierarchies become rigid, and the " +
      "current advice is to prefer composition: building objects out of other objects and using interfaces to connect the " +
      "pieces.",
  },
  {
    id: "en-java-collections",
    category: "Java",
    title: "Collections in Java",
    text:
      "Java ships with a set of ready made data structures known as the Collections framework. The three main families are " +
      "lists, sets and maps. A List keeps its items in order and allows duplicates; the most used implementation is ArrayList, " +
      "backed by an array that grows by itself. A Set does not allow duplicate items, and a HashSet answers very quickly " +
      "whether an item is already there. A Map associates keys with values, and HashMap is the default choice for dictionaries. " +
      "There are sorted versions as well, such as TreeMap, which keeps its keys in order. Collections use generics, so a list " +
      "of strings accepts only strings and the compiler complains about anything else. One important detail: for your own " +
      "objects to work well in sets and maps, the class must correctly define the equals and hashCode methods, always both " +
      "together.",
  },
  {
    id: "en-java-exceptions",
    category: "Java",
    title: "Exceptions in Java",
    text:
      "Java handles errors with exceptions, which are thrown with throw and caught with try and catch. A particular feature of " +
      "the language is checked exceptions. When a method can throw one of them, such as an error while reading a file, it must " +
      "declare it in its signature, and the caller is forced to handle it or pass it on. The idea was to force the handling of " +
      "predictable failures. Unchecked exceptions, such as using a null object or an index outside a list, point to programming " +
      "errors and do not need to be declared. The famous NullPointerException is the most common of them. For resources such as " +
      "files and connections, the try with resources block closes everything automatically at the end. Many modern libraries " +
      "prefer unchecked exceptions, because checked ones end up spreading declarations through the whole code base and " +
      "encourage empty catch blocks, which hide problems.",
  },
  {
    id: "en-java-streams",
    category: "Java",
    title: "Streams and lambdas",
    text:
      "Since Java eight, the language has lambdas, short functions written right where they are used, and the Streams API, " +
      "which lets you process collections declaratively. Instead of writing a loop with helper variables, you describe a " +
      "sequence of steps: keep the paid orders, turn each one into its amount, add everything up. Each step receives a lambda " +
      "saying what to do. Intermediate operations, such as filter and map, are lazy: nothing runs until a terminal operation, " +
      "such as collect, count or sum, asks for the result. That allows optimizations and even parallel processing with a small " +
      "change. The code gets shorter and closer to its intent. The caveat is not to overdo it: very long chains, or chains with " +
      "hidden side effects, become hard to debug, and sometimes a simple loop is clearer.",
  },
  {
    id: "en-java-memory",
    category: "Java",
    title: "Memory and the garbage collector",
    text:
      "In Java, nobody frees memory by hand. Objects are created in an area called the heap, and a component of the JVM, the " +
      "garbage collector, regularly finds the objects that no part of the program can reach anymore and reclaims their space. " +
      "That removes a whole class of errors that are common in languages such as C, like using memory that was already freed. " +
      "Most objects live for a very short time, so the JVM splits the heap into generations: new objects go into a small area " +
      "that is collected often and quickly, and the ones that survive are promoted to a larger area. Modern collectors, such as " +
      "G1 and ZGC, do much of their work while the program runs and keep pauses short. Even so, memory leaks are still " +
      "possible: all it takes is holding references to objects that will never be used again, for example in a list that only " +
      "grows.",
  },
  {
    id: "en-java-spring",
    category: "Java",
    title: "Spring Boot",
    text:
      "Spring is the most widely used framework for building systems in Java, especially APIs and server applications. Its " +
      "central idea is dependency injection: instead of each class creating the objects it needs, it only declares what it " +
      "needs, and Spring creates, keeps and hands over the right pieces. That keeps the parts of the system decoupled and much " +
      "easier to test. Spring Boot came to simplify configuration. With a few annotations, it starts an embedded web server, " +
      "connects to the database, exposes endpoints and applies sensible default settings, which can be replaced when needed. " +
      "Around it there is a huge ecosystem: Spring Data to access databases with very little code, Spring Security for " +
      "authentication and permissions, and tools to monitor the application in production. That is why it dominates backend " +
      "jobs in Java.",
  },
  {
    id: "en-java-build",
    category: "Java",
    title: "Maven and Gradle",
    text:
      "Java projects are rarely compiled by hand. Build tools such as Maven and Gradle take care of downloading libraries, " +
      "compiling the code, running the tests and packaging the result into a file that is ready to run. In Maven, the project " +
      "is described in an XML file that lists the dependencies with their names and versions, and the tool fetches everything " +
      "from a central repository on the internet. Maven follows a standard folder layout and a standard sequence of phases, so " +
      "anyone quickly understands a new project. Gradle uses a script instead of XML, which gives more flexibility, and it is " +
      "usually faster thanks to caching and incremental builds; it is the standard tool for Android projects. Both solve the " +
      "same core problem: making sure that every machine, from yours to the continuous integration server, builds exactly the " +
      "same program.",
  },
  {
    id: "en-java-types",
    category: "Java",
    title: "Primitive types and objects",
    text:
      "Java splits values into two worlds. Primitive types, such as int, double and boolean, hold the value directly and are " +
      "very light. Everything else is an object, reached through a reference. Each primitive has a matching class, such as " +
      "Integer for int, because collections only accept objects. Conversion between the two happens automatically, which is " +
      "convenient but hides traps: comparing two Integer objects with the equality operator compares references, not values, " +
      "and can give different results depending on the number. For objects, content must be compared with the equals method. " +
      "Another classic point is String, which is immutable: every method that seems to change a piece of text actually returns " +
      "a new one. That is why long strings built inside a loop should use a StringBuilder, avoiding thousands of temporary " +
      "objects.",
  },
];

export const TEXTS: TypingText[] = EN.map((t) => ({ ...t, lang: "en" as const }));
