export interface Question {
  id: string;
  category: 'Pattern' | 'Logic' | 'HR' | 'ABAP';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  title: string;
  description: string;
  logic: string;
  hint: string;
  xpFirstSolve: number;
  xpRepeatSolve: number;
  pseudoCode?: string;
  correctAnswer?: string;
}

export const QUESTIONS: Question[] = [
  // ==========================================
  // --- ABAP ELITE PROTOCOLS (1-15) ---
  // ==========================================
  {
    id: 'abap-001',
    category: 'ABAP',
    difficulty: 'Easy',
    title: 'Defensive FOR ALL ENTRIES',
    description: 'Implement the safety check required before executing a SELECT with FOR ALL ENTRIES IN lt_data.',
    logic: 'if lt_data is not initial. select ... for all entries in lt_data. endif.',
    hint: 'An empty table in FOR ALL ENTRIES causes the database to select ALL records.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'abap-002',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'Modern VALUE Operator',
    description: 'Use the VALUE operator to initialize an internal table with 3 hardcoded values for the field "MATNR".',
    logic: 'lt_mat = value #( ( matnr = \'A\' ) ( matnr = \'B\' ) ( matnr = \'C\' ) ).',
    hint: 'ABAP 7.40 syntax uses VALUE #( ... ).',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'abap-003',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'CDS Association Logic',
    description: 'Define a simple CDS view with an association to another view _Items on $projection.ID = _Items.ParentID.',
    logic: 'association [1..*] to z_items as _items on $projection.id = _items.parentid',
    hint: 'Associations are "lazy joins" in CDS.',
    xpFirstSolve: 40, xpRepeatSolve: 10
  },
  {
    id: 'abap-004',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'CORRESPONDING Mapping',
    description: 'Use the CORRESPONDING operator to map fields from lt_src to lt_dest where field names are different (A to B).',
    logic: 'lt_dest = corresponding #( lt_src mapping b = a ).',
    hint: 'Use the MAPPING addition in the CORRESPONDING operator.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'abap-005',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'AMDP Method Definition',
    description: 'What addition is required in an ABAP method definition to mark it as an AMDP for HANA?',
    logic: 'by database procedure for hdb language sqlscript using table_name.',
    hint: 'It follows the METHOD ... BY DATABASE PROCEDURE addition.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'abap-006',
    category: 'ABAP',
    difficulty: 'Easy',
    title: 'Binary Search Requirement',
    description: 'What must be done to an internal table before using the READ TABLE ... BINARY SEARCH statement?',
    logic: 'sort the internal table by the key fields used in the search.',
    hint: 'Sorting is mandatory for binary search to function correctly.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'abap-007',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'BAdI Call Protocol',
    description: 'Implement the modern logic to call a BAdI instance using the GET BADI and CALL BADI statements.',
    logic: 'get badi lo_badi. call badi lo_badi->method_name.',
    hint: 'Use GET BADI followed by CALL BADI.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'abap-008',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'SALV Filter Logic',
    description: 'How do you apply a filter to a specific column in an ALV Object Model (CL_SALV_TABLE)?',
    logic: 'lo_salv->get_filters( )->add_filter( columnname = \'NAME\' low = \'X\' ).',
    hint: 'Access the filter object via GET_FILTERS().',
    xpFirstSolve: 35, xpRepeatSolve: 7
  },
  {
    id: 'abap-009',
    category: 'ABAP',
    difficulty: 'Easy',
    title: 'Concatenation with Pipe',
    description: 'Concatenate two strings lv_a and lv_b with a space using the string template syntax.',
    logic: 'lv_res = |{ lv_a } { lv_b }|.',
    hint: 'Use the pipe symbol | and curly braces { }.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'abap-010',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'Field Symbols Safely',
    description: 'Implement a safe loop over lt_data using field-symbols and checking for successful assignment.',
    logic: 'loop at lt_data assigning field-symbol(<ls_row>). endloop.',
    hint: 'Field-symbols are direct pointers to table memory.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'abap-011',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'Dynamic Internal Table',
    description: 'What method of CL_ALV_TABLE_CREATE is used to generate a dynamic internal table from a field catalog?',
    logic: 'cl_alv_table_create=>create_dynamic_table.',
    hint: 'This static method creates a table handle.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'abap-012',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'Try-Catch Protocol',
    description: 'Write a basic TRY-CATCH block to handle a division by zero exception (CX_SY_ZERODIVIDE).',
    logic: 'try. res = a / b. catch cx_sy_zerodivide into lo_err. endtry.',
    hint: 'Use TRY, CATCH, and ENDTRY.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'abap-013',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'Object Downcasting',
    description: 'Implement the syntax to safely downcast a general object lo_parent to a specific type lo_child.',
    logic: 'lo_child ?= lo_parent.',
    hint: 'Use the casting operator ?=.',
    xpFirstSolve: 40, xpRepeatSolve: 8
  },
  {
    id: 'abap-014',
    category: 'ABAP',
    difficulty: 'Easy',
    title: 'Append to Table',
    description: 'Append a single structure ls_data to an internal table lt_data using the modern syntax.',
    logic: 'lt_data = value #( base lt_data ( ls_data ) ).',
    hint: 'You can use APPEND or VALUE #( BASE ... ).',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'abap-015',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'Select Single with Key',
    description: 'Write an OpenSQL query to select one field MATNR from table MARA for a specific MATNR into a variable.',
    logic: 'select single matnr from mara where matnr = @lv_matnr into @lv_res.',
    hint: 'Use SELECT SINGLE and host variables with @.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },

  // ==========================================
  // --- LOGIC GATES (16-30) ---
  // ==========================================
  {
    id: 'logic-001',
    category: 'Logic',
    difficulty: 'Easy',
    title: 'Factorial Recursion',
    description: 'Implement the logic for a recursive factorial function f(n).',
    logic: 'if n <= 1 return 1 else return n * f(n-1).',
    hint: 'The base case is n=1.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'logic-002',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Binary Search Logic',
    description: 'Describe the logic to find an element in a sorted array by splitting it in half.',
    logic: 'compare target with mid. if match done. if smaller search left. if larger search right.',
    hint: 'Requires a sorted data set.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'logic-003',
    category: 'Logic',
    difficulty: 'Hard',
    title: 'Fibonacci Optimization',
    description: 'How do you optimize Fibonacci calculation to O(n) using dynamic programming?',
    logic: 'store previous two values in variables or an array to avoid redundant recursive calls.',
    hint: 'This technique is called memoization or iteration.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'logic-004',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Anagram Detection',
    description: 'What is the most efficient logic to check if two strings are anagrams?',
    logic: 'sort both strings and compare, or count character frequencies using a hash map.',
    hint: 'Character counts must be identical.',
    xpFirstSolve: 35, xpRepeatSolve: 7
  },
  {
    id: 'logic-005',
    category: 'Logic',
    difficulty: 'Easy',
    title: 'Even or Odd Bitwise',
    description: 'Use a bitwise operator to check if an integer N is odd.',
    logic: 'n & 1 equals 1.',
    hint: 'The last bit of an odd number is always 1.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'logic-006',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Reversing a String',
    description: 'What logic would you use to reverse a string in-place without a built-in reverse function?',
    logic: 'swap first and last characters, then second and second-last, moving towards the center.',
    hint: 'Use a two-pointer approach.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'logic-007',
    category: 'Logic',
    difficulty: 'Hard',
    title: 'Merge Sort Protocol',
    description: 'Explain the "Divide and Conquer" logic of the Merge Sort algorithm.',
    logic: 'split array into halves until single elements, then merge halves back in sorted order.',
    hint: 'Recursively split and then merge.',
    xpFirstSolve: 50, xpRepeatSolve: 15
  },
  {
    id: 'logic-008',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Peak Element Search',
    description: 'Find an element in an array that is greater than its neighbors.',
    logic: 'iterate and check if current > previous and current > next.',
    hint: 'Ends of the array only have one neighbor.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'logic-009',
    category: 'Logic',
    difficulty: 'Easy',
    title: 'Swap Without Temp',
    description: 'How do you swap two integers A and B without using a third temporary variable?',
    logic: 'a = a + b, b = a - b, a = a - b or use XOR operation.',
    hint: 'Mathematical or bitwise operations can do this.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'logic-010',
    category: 'Logic',
    difficulty: 'Hard',
    title: 'Deadlock Conditions',
    description: 'Identify the four necessary conditions for a system deadlock to occur.',
    logic: 'mutual exclusion, hold and wait, no preemption, circular wait.',
    hint: 'Coffman conditions.',
    xpFirstSolve: 50, xpRepeatSolve: 20
  },
  {
    id: 'logic-011',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Bubble Sort Complexity',
    description: 'What is the average time complexity of the Bubble Sort algorithm?',
    logic: 'o(n^2) because of nested loops comparing each pair.',
    hint: 'It involves adjacent swaps in every pass.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'logic-012',
    category: 'Logic',
    difficulty: 'Easy',
    title: 'Leap Year Logic',
    description: 'What is the logical condition to determine if a year Y is a leap year?',
    logic: 'divisible by 4 and (not divisible by 100 or divisible by 400).',
    hint: 'Centurial years must be divisible by 400.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'logic-013',
    category: 'Logic',
    difficulty: 'Hard',
    title: 'Depth First Search',
    description: 'Describe the logic of DFS traversal in a graph.',
    logic: 'start at root, explore as far as possible along each branch before backtracking.',
    hint: 'Uses a stack or recursion.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'logic-014',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Palindrome Checker',
    description: 'What is the logic to check if a word is a palindrome?',
    logic: 'compare the word with its reverse, or compare characters from both ends meeting in the middle.',
    hint: 'Reads the same forward and backward.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'logic-015',
    category: 'Logic',
    difficulty: 'Easy',
    title: 'Find Max in Array',
    description: 'Implement the logic to find the maximum value in an unsorted array.',
    logic: 'initialize max with first element, then compare with every other element and update if larger.',
    hint: 'Requires a single pass through the array.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },

  // ==========================================
  // --- PATTERN ARCHITECTURE (31-45) ---
  // ==========================================
  {
    id: 'pattern-001',
    category: 'Pattern',
    difficulty: 'Easy',
    title: 'Singleton Logic',
    description: 'What is the core logic required to implement the Singleton pattern?',
    logic: 'private constructor, a static private instance variable, and a public static getter method.',
    hint: 'Restricts instantiation to exactly one object.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'pattern-002',
    category: 'Pattern',
    difficulty: 'Medium',
    title: 'Observer Pattern',
    description: 'Explain the relationship between the Subject and Observers in the Observer pattern.',
    logic: 'subject maintains a list of dependents and notifies them automatically of any state changes.',
    hint: 'Think about event listeners and subscribers.',
    xpFirstSolve: 35, xpRepeatSolve: 7
  },
  {
    id: 'pattern-003',
    category: 'Pattern',
    difficulty: 'Hard',
    title: 'Strategy Pattern Decoupling',
    description: 'How does the Strategy pattern enable switching algorithms at runtime?',
    logic: 'defines a family of algorithms, encapsulates each one, and makes them interchangeable.',
    hint: 'The client holds a reference to a Strategy interface.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'pattern-004',
    category: 'Pattern',
    difficulty: 'Medium',
    title: 'Factory Method Intent',
    description: 'What is the primary goal of the Factory Method pattern?',
    logic: 'define an interface for creating an object, but let subclasses decide which class to instantiate.',
    hint: 'Delegates instantiation to subclasses.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'pattern-005',
    category: 'Pattern',
    difficulty: 'Easy',
    title: 'Adapter Pattern Purpose',
    description: 'What does the Adapter pattern allow two incompatible interfaces to do?',
    logic: 'converts the interface of a class into another interface clients expect.',
    hint: 'Acts as a wrapper or translator.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'pattern-006',
    category: 'Pattern',
    difficulty: 'Hard',
    title: 'Decorator Pattern Logic',
    description: 'How does the Decorator pattern add behavior to an object without using inheritance?',
    logic: 'wraps the original object and provides additional functionality while maintaining the same interface.',
    hint: 'Uses composition to extend behavior.',
    xpFirstSolve: 50, xpRepeatSolve: 15
  },
  {
    id: 'pattern-007',
    category: 'Pattern',
    difficulty: 'Medium',
    title: 'Proxy Pattern Utility',
    description: 'What is a common use case for the Proxy pattern?',
    logic: 'acting as a placeholder or representative for another object to control access or add security.',
    hint: 'Can be used for lazy loading or remote access.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'pattern-008',
    category: 'Pattern',
    difficulty: 'Easy',
    title: 'Facade Pattern Logic',
    description: 'What problem does the Facade pattern solve in a complex system?',
    logic: 'provides a simplified interface to a larger, more complex body of code or subsystem.',
    hint: 'Think of it as a simplified entry point.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'pattern-009',
    category: 'Pattern',
    difficulty: 'Hard',
    title: 'Composite Pattern Structure',
    description: 'How does the Composite pattern treat individual objects and compositions of objects?',
    logic: 'it allows clients to treat both individual objects and groups of objects uniformly.',
    hint: 'Used for tree structures like file systems.',
    xpFirstSolve: 45, xpRepeatSolve: 12
  },
  {
    id: 'pattern-010',
    category: 'Pattern',
    difficulty: 'Medium',
    title: 'Template Method Protocol',
    description: 'Where is the skeleton of an algorithm defined in the Template Method pattern?',
    logic: 'defined in a base class method, while some steps are deferred to subclasses.',
    hint: 'Fixed structure with variable implementation steps.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'pattern-011',
    category: 'Pattern',
    difficulty: 'Easy',
    title: 'Builder Pattern Goal',
    description: 'What type of object creation is best suited for the Builder pattern?',
    logic: 'objects that require complex, step-by-step construction or have many parameters.',
    hint: 'Separates construction from representation.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'pattern-012',
    category: 'Pattern',
    difficulty: 'Hard',
    title: 'State Pattern Encapsulation',
    description: 'How does the State pattern manage behavior based on an object\'s internal state?',
    logic: 'encapsulates states as objects and delegates the behavior to the current state object.',
    hint: 'Object appears to change its class when state changes.',
    xpFirstSolve: 50, xpRepeatSolve: 20
  },
  {
    id: 'pattern-013',
    category: 'Pattern',
    difficulty: 'Medium',
    title: 'Command Pattern Decoupling',
    description: 'What does the Command pattern decouple in a system?',
    logic: 'it decouples the object that invokes the operation from the one that knows how to perform it.',
    hint: 'Encapsulates a request as an object.',
    xpFirstSolve: 35, xpRepeatSolve: 8
  },
  {
    id: 'pattern-014',
    category: 'Pattern',
    difficulty: 'Easy',
    title: 'Prototype Pattern Utility',
    description: 'How are new objects created in the Prototype pattern?',
    logic: 'by cloning or copying an existing instance (prototype) instead of creating from scratch.',
    hint: 'Avoids the overhead of expensive initialization.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'pattern-015',
    category: 'Pattern',
    difficulty: 'Hard',
    title: 'Mediator Pattern Logic',
    description: 'What is the primary role of the Mediator in a multi-object interaction?',
    logic: 'it centralizes communication between objects to reduce their direct dependencies (loose coupling).',
    hint: 'Think of it as an air traffic controller.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },

  // ==========================================
  // --- HR LEADERSHIP (46-60) ---
  // ==========================================
  {
    id: 'hr-001',
    category: 'HR',
    difficulty: 'Easy',
    title: 'STAR Interview Logic',
    description: 'What do the letters in the STAR method stand for in behavioral interviews?',
    logic: 'situation, task, action, result.',
    hint: 'A structured way to answer experience-based questions.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'hr-002',
    category: 'HR',
    difficulty: 'Medium',
    title: 'Conflict Resolution Protocol',
    description: 'What is the first logical step when resolving a conflict between two team members?',
    logic: 'identify the underlying cause and listen to both perspectives without bias.',
    hint: 'Seek first to understand, then to be understood.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'hr-003',
    category: 'HR',
    difficulty: 'Hard',
    title: 'Mentorship Strategy',
    description: 'How should a senior engineer handle a junior engineer making repeated technical errors?',
    logic: 'provide constructive feedback, identify the root gap in knowledge, and pair program to demonstrate the correct approach.',
    hint: 'Focus on growth and systemic improvement, not just fixing the bug.',
    xpFirstSolve: 40, xpRepeatSolve: 10
  },
  {
    id: 'hr-004',
    category: 'HR',
    difficulty: 'Medium',
    title: 'Prioritization Logic',
    description: 'Using the Eisenhower Matrix, which tasks should be handled first?',
    logic: 'urgent and important tasks (quadrant 1).',
    hint: 'Focus on the intersection of urgency and impact.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'hr-005',
    category: 'HR',
    difficulty: 'Easy',
    title: 'Constructive Feedback',
    description: 'What is the "Sandwich" method for providing feedback?',
    logic: 'positive comment, constructive criticism, and ending with another positive reinforcement.',
    hint: 'Encapsulate the correction within layers of support.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'hr-006',
    category: 'HR',
    difficulty: 'Hard',
    title: 'Stakeholder Management',
    description: 'How do you handle a non-technical stakeholder requesting a feature that is technically impossible?',
    logic: 'explain the technical constraints in simple terms and propose a viable alternative that meets their underlying business goal.',
    hint: 'Communicate trade-offs and focus on business value.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'hr-007',
    category: 'HR',
    difficulty: 'Medium',
    title: 'Time Management Logic',
    description: 'Explain the Pomodoro technique for focus.',
    logic: '25 minutes of intense focus followed by a 5-minute break.',
    hint: 'Uses short intervals of productivity.',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'hr-008',
    category: 'HR',
    difficulty: 'Easy',
    title: 'Active Listening Goal',
    description: 'What is the primary goal of active listening during a technical requirement session?',
    logic: 'to fully understand the speaker\'s intent and clarify details by paraphrasing their points.',
    hint: 'It goes beyond just hearing the words.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'hr-009',
    category: 'HR',
    difficulty: 'Hard',
    title: 'Handling Technical Debt',
    description: 'What is the best way to present the need for refactoring technical debt to management?',
    logic: 'link technical debt reduction to long-term cost savings, faster feature delivery, and system stability.',
    hint: 'Translate technical risk into business risk.',
    xpFirstSolve: 50, xpRepeatSolve: 20
  },
  {
    id: 'hr-010',
    category: 'HR',
    difficulty: 'Medium',
    title: 'Effective Delegation',
    description: 'What should be clearly defined when delegating a task to another engineer?',
    logic: 'the expected outcome, the deadline, and the level of authority/autonomy they have.',
    hint: 'Specify "What" and "When", not necessarily "How".',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'hr-011',
    category: 'HR',
    difficulty: 'Easy',
    title: 'Team Cohesion',
    description: 'What is the benefit of a "blameless post-mortem" after a system failure?',
    logic: 'to identify process failures and prevent recurrence without discouraging taking responsibility.',
    hint: 'Focus on the "How" and "What", not the "Who".',
    xpFirstSolve: 20, xpRepeatSolve: 4
  },
  {
    id: 'hr-012',
    category: 'HR',
    difficulty: 'Hard',
    title: 'Scaling Technical Teams',
    description: 'What is a major challenge when moving from a 5-person team to a 20-person team?',
    logic: 'communication overhead and the need for standardized processes and documentation.',
    hint: 'Brooks\' Law often applies here.',
    xpFirstSolve: 50, xpRepeatSolve: 20
  },
  {
    id: 'hr-013',
    category: 'HR',
    difficulty: 'Medium',
    title: 'Emotional Intelligence (EQ)',
    description: 'Why is EQ considered critical for senior engineering roles?',
    logic: 'it aids in navigating complex team dynamics, mentoring, and maintaining calm during outages.',
    hint: 'Technical skills are only half the battle at senior levels.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'hr-014',
    category: 'HR',
    difficulty: 'Easy',
    title: 'Goal Setting Protocol',
    description: 'What do SMART goals stand for?',
    logic: 'specific, measurable, achievable, relevant, and time-bound.',
    hint: 'A framework for setting effective objectives.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'hr-015',
    category: 'HR',
    difficulty: 'Hard',
    title: 'Decision Making Paradox',
    description: 'How do you handle a situation where two senior architects strongly disagree on a core technology choice?',
    logic: 'evaluate both options against business goals, run a small proof-of-concept (POC), and choose the one with better long-term support and flexibility.',
    hint: 'Use data-driven decisions to break the deadlock.',
    xpFirstSolve: 45, xpRepeatSolve: 15
  },
  {
    id: 'abap-016',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'RAP Managed Early Numbering',
    description: 'Implement the early numbering logic in a RAP managed implementation for field "UUID".',
    logic: 'mapped-entity = value #( ( %cid = entity-%cid uuid = cl_system_uuid=>create_uuid_x16_static( ) ) ).',
    hint: 'Use CL_SYSTEM_UUID in the ADJUST_NUMBERS or early numbering block.',
    xpFirstSolve: 50, xpRepeatSolve: 15
  },
  {
    id: 'abap-017',
    category: 'ABAP',
    difficulty: 'Medium',
    title: 'New Select with Union',
    description: 'Write an ABAP 7.50+ SELECT statement that combines results from two tables using UNION.',
    logic: 'select a from tab1 union select a from tab2 into table @lt_res.',
    hint: 'UNION was introduced in modern OpenSQL.',
    xpFirstSolve: 30, xpRepeatSolve: 6
  },
  {
    id: 'logic-016',
    category: 'Logic',
    difficulty: 'Hard',
    title: 'Knapsack 0/1 Logic',
    description: 'Explain the core logic of the 0/1 Knapsack problem using dynamic programming.',
    logic: 'build a 2D table where dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w-wt[i]]).',
    hint: 'Consider whether to include or exclude each item based on capacity.',
    xpFirstSolve: 55, xpRepeatSolve: 20
  },
  {
    id: 'logic-017',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Circular Linked List Loop',
    description: 'What algorithm is used to detect a loop in a linked list?',
    logic: 'floyd\'s cycle-finding algorithm using a slow and a fast pointer.',
    hint: 'If they meet, there is a cycle.',
    xpFirstSolve: 35, xpRepeatSolve: 8
  },
  {
    id: 'pattern-016',
    category: 'Pattern',
    difficulty: 'Hard',
    title: 'Flyweight Pattern Logic',
    description: 'How does the Flyweight pattern reduce memory usage in applications with many similar objects?',
    logic: 'sharing as much data as possible with other similar objects (extrinsic vs intrinsic state).',
    hint: 'Store shared state externally.',
    xpFirstSolve: 50, xpRepeatSolve: 15
  },
  {
    id: 'pattern-017',
    category: 'Pattern',
    difficulty: 'Medium',
    title: 'Bridge Pattern Intent',
    description: 'What is the primary intent of the Bridge design pattern?',
    logic: 'decouple an abstraction from its implementation so that the two can vary independently.',
    hint: 'Go beyond just interfaces; think about hierarchies.',
    xpFirstSolve: 35, xpRepeatSolve: 8
  },
  {
    id: 'hr-016',
    category: 'HR',
    difficulty: 'Medium',
    title: 'Handling Negative Feedback',
    description: 'How should you react when receiving significant negative feedback on a code review?',
    logic: 'stay objective, don\'t take it personally, ask clarifying questions, and use it as a learning opportunity.',
    hint: 'Professionalism and growth mindset are key.',
    xpFirstSolve: 25, xpRepeatSolve: 5
  },
  {
    id: 'hr-017',
    category: 'HR',
    difficulty: 'Easy',
    title: 'Meeting Protocol (ELITE)',
    description: 'What is the most important component of a productive technical meeting?',
    logic: 'a clear agenda, defined goals, and actionable follow-up items.',
    hint: 'Preparation prevents poor performance.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'abap-018',
    category: 'ABAP',
    difficulty: 'Hard',
    title: 'Cloud Optimized SQL',
    description: 'Which addition in the SELECT statement is used to restrict the number of rows in ABAP Cloud (Steampunk)?',
    logic: 'order by ... subtotal ... count( * ) ... fields ... limit 100.',
    hint: 'Use the LIMIT and OFFSET clauses.',
    xpFirstSolve: 40, xpRepeatSolve: 10
  },
  {
    id: 'logic-018',
    category: 'Logic',
    difficulty: 'Easy',
    title: 'String Length Calculation',
    description: 'Implement the logic to find the length of a string without using built-in length functions.',
    logic: 'iterate through characters with a counter until a null terminator or end of sequence is reached.',
    hint: 'Use a simple loop.',
    xpFirstSolve: 15, xpRepeatSolve: 3
  },
  {
    id: 'logic-019',
    category: 'Logic',
    difficulty: 'Medium',
    title: 'Synaptic Flux Optimization: Nexus Core Render Discipline',
    description: 'The \'Nexus Core\' real-time monitoring interface is experiencing severe computational latency. Sensor data from hundreds of \'Neural Conduit\' nodes streams in constantly, and individual \'ConduitPanel\' child components re-render even when their specific dedicated data remains unchanged. Refactor the ConduitPanel component and its immediate parent(s) to enforce \'render discipline\'. Ensure that a ConduitPanel only re-renders when its specific conduitData deeply changes or onClick callback is invoked. Use React.memo and useCallback to prevent unnecessary child re-renders.',
    logic: 'React.memo(ConduitPanel) with stable onClick parent callback using useCallback.',
    hint: 'Use React.memo to wrap ConduitPanel, and use React.useCallback to memoize the click handler in the parent NexusMonitor to maintain stable references.',
    xpFirstSolve: 30, xpRepeatSolve: 6,
    correctAnswer: 'React.memo',
    pseudoCode: `interface ConduitData { id: string; status: 'active' | 'dormant' | 'critical'; fluxLevel: number; }

// Parent Component (simulated, assume it fetches data and passes it down)
function NexusMonitor({ allConduitData }: { allConduitData: ConduitData[] }) {
  // ... (some state or props might cause re-renders here)
  return (
    <div>
      {allConduitData.map(data => (
        <ConduitPanel key={data.id} conduitData={data} onClick={() => console.log('clicked', data.id)} />
      ))}
    </div>
  );
}

// Target Child Component for Optimization
function ConduitPanel({ conduitData, onClick }: { conduitData: ConduitData; onClick: () => void }) {
  console.log(\`Rendering ConduitPanel \${conduitData.id}\`);
  return (
    <div onClick={onClick}>
      <h3>Conduit ID: {conduitData.id}</h3>
      <p>Status: {conduitData.status}</p>
      <p>Flux Level: {conduitData.fluxLevel}</p>
    </div>
  );
}`
  }
];
