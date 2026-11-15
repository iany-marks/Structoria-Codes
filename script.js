const searchInput = document.querySelector("#course-search");
const courseCards = [...document.querySelectorAll(".course-card")];
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector(".toast");
const infoDialog = document.querySelector("#info-dialog");
const authDialog = document.querySelector("#auth-dialog");
const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-dialog-title");
const authSubmit = document.querySelector(".auth-submit");
const authTabs = [...document.querySelectorAll(".auth-tab")];
const authActions = document.querySelector("#auth-actions");
const profileButton = document.querySelector("#profile-button");
const profileAvatar = document.querySelector("#profile-avatar");
const profileAvatarLarge = document.querySelector("#profile-avatar-large");
const profileName = document.querySelector("#profile-name");
const profileSummaryName = document.querySelector("#profile-summary-name");
const profileGreeting = document.querySelector("#profile-greeting");
const profileForm = document.querySelector("#profile-form");
const profileNameField = document.querySelector("#profileName");
const profileEmailField = document.querySelector("#profileEmail");
const profilePasswordField = document.querySelector("#profilePassword");
const profileCurrentPasswordField = document.querySelector("#profileCurrentPassword");
const profileSummaryEmail = document.querySelector("#profile-summary-email");
const emailUpdatesField = document.querySelector("#emailUpdates");
const logoutButton = document.querySelector("#logout-button");
const profileDialog = document.querySelector("#profile-settings-dialog");
const upgradeDialog = document.querySelector("#upgrade-dialog");
const billingTabs = [...document.querySelectorAll(".billing-tab")];
const planCards = [...document.querySelectorAll(".plan-card")];
const paymentMethods = [...document.querySelectorAll(".payment-method")];
const selectedPlanName = document.querySelector("#selected-plan-name");
const selectedPlanPrice = document.querySelector("#selected-plan-price");
const upgradeSubmit = document.querySelector("#upgrade-submit");
const authFields = {
  name: document.querySelector('[data-field="name"]'),
  confirmPassword: document.querySelector('[data-field="confirmPassword"]'),
  extras: document.querySelector('[data-row="extras"]'),
};
const authStatus = document.querySelector("#auth-status");
const resendVerificationButton = document.querySelector("#resend-verification");
const disciplinePage = document.querySelector("#civil-engineering-page");
const disciplineGrid = document.querySelector("#discipline-grid");
const disciplineSearch = document.querySelector("#discipline-search");
const disciplineEmpty = document.querySelector("#discipline-empty");
const columnDesignOpen = document.querySelector("#column-design-open");
const columnDesigner = document.querySelector("#column-designer");
const columnDesignForm = document.querySelector("#column-design-form");
const columnDesignInputs = document.querySelector("#column-design-inputs");
const columnTitleBlock = document.querySelector("#column-title-block");
const columnDesignResults = document.querySelector("#column-design-results");
const columnCalculationState = document.querySelector("#column-calculation-state");
const columnCalculateButton = document.querySelector("#column-calculate");
const columnDownloadPdf = document.querySelector("#column-download-pdf");
const slabDesignOpen = document.querySelector("#slab-design-open");
const slabDesigner = document.querySelector("#slab-designer");
const slabDesignForm = document.querySelector("#slab-design-form");
const slabDesignInputs = document.querySelector("#slab-design-inputs");
const slabTitleBlock = document.querySelector("#slab-title-block");
const slabDesignResults = document.querySelector("#slab-design-results");
const slabCalculationState = document.querySelector("#slab-calculation-state");
const slabCalculateButton = document.querySelector("#slab-calculate");
const slabDownloadPdf = document.querySelector("#slab-download-pdf");
const heroPhotos = [...document.querySelectorAll(".hero-photo")];
const heroDots = document.querySelector("#hero-slide-dots");
const heroSlideCount = document.querySelector("#hero-slide-count");
const heroPauseButton = document.querySelector("#hero-pause");
let toastTimeout;
let civilEngineeringPath = ["Civil Engineering"];
let authMode = "login";
let currentHeroSlide = 0;
let heroTransitionId = 0;
let heroTimer;
let heroPaused = false;
let selectedBilling = "monthly";
let selectedPlan = "pro";
let selectedPayment = "card";
let latestColumnResult = null;
let latestColumnInputs = null;
let latestColumnTitleBlock = null;
let currentSlabType = null;
let latestSlabResult = null;
let latestSlabInputs = null;
let latestSlabTitleBlock = null;

const pricing = {
  monthly: {
    starter: { name: "Starter", label: "$12/mo" },
    pro: { name: "Pro", label: "$19/mo" },
    team: { name: "Team", label: "$39/mo" },
  },
  yearly: {
    starter: { name: "Starter", label: "$120/yr" },
    pro: { name: "Pro", label: "$180/yr" },
    team: { name: "Team", label: "$360/yr" },
  },
};
const paymentLabels = {
  card: "Card",
  paypal: "PayPal",
  apple: "Apple Pay",
  bank: "Bank transfer",
};
const columnDesignGroups = [
  {
    title: "Geometry and reinforcement basics",
    fields: [
      { key: "width", label: "Column width b", cell: "C13", unit: "mm", value: 400, min: 100 },
      { key: "depth", label: "Column depth h", cell: "C14", unit: "mm", value: 400, min: 100 },
      { key: "clearHeight", label: "Clear height between restraints", cell: "C15", unit: "mm", value: 4250, min: 500 },
      { key: "floorLift", label: "Floor-to-floor lift (bar length basis)", cell: "C16", unit: "mm", value: 4700, min: 500 },
      { key: "nominalCover", label: "Nominal cover to links cnom", cell: "C17", unit: "mm", value: 40, min: 0 },
      { key: "mainBarDiameter", label: "Main bar diameter", cell: "C18", unit: "mm", value: 20, min: 6 },
      { key: "linkDiameter", label: "Minimum link diameter to use", cell: "C19", unit: "mm", value: 8, min: 6 },
      { key: "aggregateSize", label: "Maximum aggregate size dg", cell: "C20", unit: "mm", value: 20, min: 0 },
      { key: "columnCount", label: "Number of identical columns", cell: "C21", unit: "columns", value: 1, min: 1, integer: true },
    ],
  },
  {
    title: "Materials",
    fields: [
      { key: "concreteStrength", label: "Concrete strength fck", cell: "C23", unit: "N/mm²", value: 25, min: 12, max: 50, step: 0.1 },
      { key: "steelYield", label: "Steel yield strength fyk", cell: "C24", unit: "N/mm²", value: 500, min: 200, max: 700 },
      { key: "gammaConcrete", label: "Partial factor for concrete Î³c", cell: "C25", value: 1.5, min: 1 },
      { key: "gammaSteel", label: "Partial factor for steel Î³s", cell: "C26", value: 1.15, min: 1 },
      { key: "alphaCc", label: "Long-term factor Î±cc", cell: "C27", value: 0.85, min: 0.5, max: 1 },
    ],
  },
  {
    title: "Ultimate design actions",
    fields: [
      { key: "axialLoad", label: "Axial load NEd (compression positive)", cell: "C29", unit: "kN", value: 2266, min: 0 },
      { key: "momentYMajor", label: "About y-y: larger end moment M02", cell: "C30", unit: "kNm", value: 130, min: 0 },
      { key: "momentYMinor", label: "About y-y: smaller end moment M01 (signed)", cell: "C31", unit: "kNm", value: -30.33, step: 0.01 },
      { key: "shearY", label: "About y-y: design shear VEd", cell: "C32", unit: "kN", value: 85, min: 0 },
      { key: "momentZMajor", label: "About z-z: larger end moment M02 (0 for uniaxial)", cell: "C33", unit: "kNm", value: 0, min: 0 },
      { key: "momentZMinor", label: "About z-z: smaller end moment M01 (signed)", cell: "C34", unit: "kNm", value: 0 },
      { key: "shearZ", label: "About z-z: design shear VEd", cell: "C35", unit: "kN", value: 0, min: 0 },
    ],
  },
  {
    title: "Bracing and effective length",
    fields: [
      { key: "structure", label: "Frame stability", cell: "C37", value: "Braced", type: "select", options: ["Braced", "Unbraced"] },
      { key: "effectiveLengthMethod", label: "Effective-length method", cell: "C38", value: "Table (IStructE / BS 8110)", type: "select", options: ["Table (IStructE / BS 8110)", "EC2 5.8.3.2 (k1, k2)"] },
      { key: "endYTop", label: "y-y axis: end condition at top", cell: "C39", value: 2, type: "select", options: ["1", "2", "3", "4"] },
      { key: "endYBottom", label: "y-y axis: end condition at bottom", cell: "C40", value: 3, type: "select", options: ["1", "2", "3", "4"] },
      { key: "endZTop", label: "z-z axis: end condition at top", cell: "C41", value: 2, type: "select", options: ["1", "2", "3", "4"] },
      { key: "endZBottom", label: "z-z axis: end condition at bottom", cell: "C42", value: 3, type: "select", options: ["1", "2", "3", "4"] },
      { key: "k1Y", label: "y-y axis: k1 top flexibility", cell: "C43", value: 0.5, min: 0 },
      { key: "k2Y", label: "y-y axis: k2 bottom flexibility", cell: "C44", value: 1, min: 0 },
      { key: "k1Z", label: "z-z axis: k1 top flexibility", cell: "C45", value: 0.5, min: 0 },
      { key: "k2Z", label: "z-z axis: k2 bottom flexibility", cell: "C46", value: 1, min: 0 },
    ],
  },
  {
    title: "Creep, reinforcement selection and shear",
    fields: [
      { key: "creepCoefficient", label: "Final creep coefficient φ(∞,t0)", cell: "C48", value: 2, min: 0 },
      { key: "quasiPermanentRatio", label: "M0,qp / M0,Ed ratio", cell: "C49", value: 0.7, min: 0, max: 1 },
      { key: "curvatureFactor", label: "Curvature distribution factor c", cell: "C50", value: 10, min: 1 },
      { key: "barSelection", label: "Longitudinal bar selection", cell: "C52", value: "Auto", type: "select", options: ["Auto", "Manual"] },
      { key: "barsOnBFace", label: "Manual bars on each b-face nb", cell: "C53", unit: "bars", value: 4, min: 2, max: 9, integer: true },
      { key: "barsOnHFace", label: "Manual bars on each h-face nh", cell: "C54", unit: "bars", value: 4, min: 2, max: 9, integer: true },
      { key: "cotTheta", label: "Strut angle cot Î¸", cell: "C55", value: 2.5, min: 1, max: 2.5, step: 0.1 },
      { key: "linkReduction", label: "Link-spacing reduction factor near beams/laps", cell: "C56", value: 0.6, min: 0.1, max: 1, step: 0.05 },
      { key: "lapFactor", label: "Lap factor Î±6", cell: "C57", value: 1.5, min: 1, max: 1.5, step: 0.05 },
    ],
  },
];
const columnTitleFields = [
  { key: "projectTitle", label: "Project title", cell: "C2" },
  { key: "jobGroup", label: "Job / group", cell: "G2" },
  { key: "columnReference", label: "Column reference", cell: "H2" },
  { key: "revision", label: "Revision", cell: "J2" },
  { key: "designBy", label: "Designed by", cell: "C8" },
  { key: "designDate", label: "Design date", cell: "D8" },
  { key: "checkedBy", label: "Checked by", cell: "E8" },
  { key: "checkDate", label: "Check date", cell: "F8" },
  { key: "sheetNumber", label: "Sheet number", cell: "G8" },
  { key: "jobReference", label: "Job reference", cell: "H8" },
];

const slabBarDiameters = [6, 8, 10, 12, 16, 20, 25, 32, 40];
const slabMaterialFields = [
  { key: "concreteStrength", label: "Concrete strength fck", unit: "MPa", value: 25, type: "select", numeric: true, options: [20, 25, 30, 35, 40, 45, 50] },
  { key: "steelYield", label: "Reinforcement yield strength fyk", unit: "MPa", value: 500, type: "select", numeric: true, options: [460, 500] },
  { key: "gammaConcrete", label: "Concrete factor γc", value: 1.5, min: 0.1, step: 0.01 },
  { key: "gammaSteel", label: "Steel factor γs", value: 1.15, min: 0.1, step: 0.01 },
  { key: "nominalCover", label: "Nominal cover", unit: "mm", value: 25, min: 0, step: 1 },
];
const slabLoadingFields = [
  { key: "concreteUnitWeight", label: "Concrete unit weight", unit: "kN/m³", value: 25, min: 0.1, step: 0.1 },
  { key: "screedThickness", label: "Screed thickness", unit: "mm", value: 50, min: 0, step: 1 },
  { key: "screedUnitWeight", label: "Screed unit weight", unit: "kN/m³", value: 24, min: 0.1, step: 0.1 },
  { key: "finishesLoad", label: "Finishes, services and fixtures", unit: "kN/m²", value: 1, min: 0, step: 0.1 },
  { key: "imposedLoad", label: "Imposed load", unit: "kN/m²", value: 3, min: 0, step: 0.1 },
  { key: "partitionLoad", label: "Partition load", unit: "kN/m²", value: 0, min: 0, step: 0.1 },
  { key: "gammaG", label: "Permanent-load factor γG", value: 1.35, min: 0.1, step: 0.01 },
  { key: "gammaQ", label: "Variable-load factor γQ", value: 1.5, min: 0.1, step: 0.01 },
];
const slabDetailFields = {
  oneWay: [
    { key: "mainBarDiameter", label: "Bottom main bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "distributionBarDiameter", label: "Bottom distribution bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "topMainBarDiameter", label: "Top main bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "topDistributionBarDiameter", label: "Top distribution bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "edgeBarDiameter", label: "Discontinuous-edge bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "discontinuousEdgeSteel", label: "Provide discontinuous-edge top steel", value: "Yes", type: "select", options: ["Yes", "No"] },
  ],
  twoWay: [
    { key: "shortSpanBottomBarDiameter", label: "Short-span bottom bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "longSpanBottomBarDiameter", label: "Long-span bottom bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "shortSpanTopBarDiameter", label: "Short-span top bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "longSpanTopBarDiameter", label: "Long-span top bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
    { key: "edgeBarDiameter", label: "Edge bar diameter", unit: "mm", value: 10, type: "select", numeric: true, options: slabBarDiameters },
  ],
};
const slabYesNoField = (key, label, value = "Yes") => ({
  key, label, value, type: "select", options: ["Yes", "No"],
});
const slabDesignGroups = {
  oneWay: [
    {
      title: "Panel geometry and support",
      fields: [
        { key: "supportCondition", label: "Support condition", value: "End span (one end continuous)", type: "select", options: ["Simply supported", "End span (one end continuous)", "Interior span (both ends continuous)"] },
        { key: "span", label: "Effective span between supports", unit: "m", value: 3, min: 0.1, step: 0.01 },
        { key: "spanAlongSupports", label: "Slab length along supports", unit: "m", value: 9, min: 0.1, step: 0.01 },
        { key: "thickness", label: "Slab thickness", unit: "mm", value: 150, min: 50, step: 1 },
        { key: "supportWidth", label: "Support width", unit: "mm", value: 230, min: 50, step: 1 },
      ],
    },
    { title: "Materials and reinforcement detailing", fields: [...slabMaterialFields, ...slabDetailFields.oneWay] },
    { title: "Loads and partial factors", fields: slabLoadingFields },
    {
      title: "Continuous-span method preconditions",
      fields: [
        { key: "continuousSpanCount", label: "Number of similar spans", value: 3, min: 1, step: 1, integer: true },
        { key: "maxSpanVariationPercent", label: "Maximum span variation", unit: "%", value: 0, min: 0, max: 100, step: 0.1 },
      ],
    },
  ],
  twoWay: [
    {
      title: "Panel geometry and support",
      fields: [
        { key: "shortSpan", label: "Shorter span Lx", unit: "m", value: 3.2, min: 0.1, step: 0.01 },
        { key: "longSpan", label: "Longer span Ly", unit: "m", value: 6.2, min: 0.1, step: 0.01 },
        { key: "edgeCondition", label: "Panel edge condition", value: "One Long Edge Discont", type: "select", options: ["Interior Panel", "One Short Edge Discont", "One Long Edge Discont", "Two Adjacent Edges Discont", "Two Short Edges Discont", "Two Long Edges Discont", "Three Edges Discont (Long Cont)", "Three Edges Discont (Short Cont)", "Four Edges Discont"] },
        { key: "thickness", label: "Slab thickness", unit: "mm", value: 110, min: 50, step: 1 },
        { key: "supportWidth", label: "Support width", unit: "mm", value: 200, min: 50, step: 1 },
        slabYesNoField("cornersRestrained", "Restrained corners"),
        slabYesNoField("topSteelAtDiscontinuousEdges", "Top steel at discontinuous edges"),
      ],
    },
    {
      title: "Materials and reinforcement detailing",
      fields: [
        ...slabMaterialFields.map((field) =>
          field.key === "nominalCover" ? { ...field, value: 20 } : field,
        ),
        ...slabDetailFields.twoWay,
      ],
    },
    {
      title: "Loads and partial factors",
      fields: slabLoadingFields.map((field) =>
        field.key === "partitionLoad" ? { ...field, value: 1.5 } : field,
      ),
    },
  ],
  simplySupported: [
    {
      title: "Panel geometry and support",
      fields: [
        { key: "shortSpan", label: "Shorter span Lx", unit: "m", value: 3, min: 0.1, step: 0.01 },
        { key: "longSpan", label: "Longer span Ly", unit: "m", value: 5, min: 0.1, step: 0.01 },
        { key: "panelType", label: "Corner restraint case", value: "2 - Simply supported, corners restrained", type: "select", options: ["1 - Simply supported (corners free to lift)", "2 - Simply supported, corners restrained"] },
        { key: "thickness", label: "Slab thickness", unit: "mm", value: 150, min: 50, step: 1 },
        { key: "supportWidth", label: "Support width", unit: "mm", value: 200, min: 50, step: 1 },
        slabYesNoField("topSteelAtDiscontinuousEdges", "Top steel at discontinuous edges"),
      ],
    },
    {
      title: "Materials and reinforcement detailing",
      fields: [
        ...slabMaterialFields.map((field) =>
          field.key === "concreteStrength" ? { ...field, value: 20 } : field,
        ),
        ...slabDetailFields.twoWay.map((field) =>
          field.key.endsWith("BottomBarDiameter") ? { ...field, value: 12 } : field,
        ),
      ],
    },
    {
      title: "Loads and partial factors",
      fields: slabLoadingFields.map((field) =>
        field.key === "imposedLoad" ? { ...field, value: 2 } : field,
      ),
    },
  ],
};
const slabTitleFields = [
  { key: "projectTitle", label: "Project title", cell: "C2" },
  { key: "jobGroup", label: "Job / group", cell: "G2" },
  { key: "slabReference", label: "Slab reference", cell: "H2" },
  { key: "revision", label: "Revision", cell: "J2" },
  { key: "client", label: "Client", cell: "G4" },
  { key: "designBy", label: "Designed by", cell: "C8" },
  { key: "designDate", label: "Design date", cell: "D8" },
  { key: "checkedBy", label: "Checked by", cell: "E8" },
  { key: "checkDate", label: "Check date", cell: "F8" },
  { key: "sheetNumber", label: "Sheet number", cell: "G8" },
  { key: "jobReference", label: "Job reference", cell: "H8" },
];

const heroSlides = [
  {
    title: "Civil Engineering",
    description: "Shape the places where life happens. Explore structural design, infrastructure and the engineering behind our built world.",
    image: "assets/hero-civil-engineering.jpg",
  },
  {
    title: "Architecture",
    description: "Imagine spaces that bring people together, then turn bold ideas into places people can call their own.",
    image: "assets/hero-architecture.jpg",
  },
  {
    title: "Mechanical Engineering",
    description: "Discover the machines, materials and ingenious mechanisms that keep our world moving.",
    image: "assets/hero-mechanical-engineering.jpg",
  },
  {
    title: "Electrical Engineering",
    description: "Explore the power systems and electrical networks that connect communities and drive innovation.",
    image: "assets/hero-electrical-engineering.jpg",
  },
  {
    title: "Computer Science",
    description: "Build the logic behind tomorrow's technology, from computing fundamentals to intelligent systems.",
    image: "assets/hero-computer-science.jpg",
  },
  {
    title: "Chemical Engineering",
    description: "See how chemistry, process design and creative problem-solving transform materials at scale.",
    image: "assets/hero-chemical-engineering.jpg",
  },
  {
    title: "Mathematics",
    description: "Find the patterns and powerful ideas that make complex STEM problems easier to understand.",
    image: "assets/hero-mathematics.jpg",
  },
  {
    title: "Physics",
    description: "Explore the forces, energy and natural laws that shape everything from tiny particles to the cosmos.",
    image: "assets/hero-physics.jpg",
  },
  {
    title: "Environmental Science",
    description: "Understand Earth's living systems and discover practical ways to build a more sustainable future.",
    image: "assets/hero-environmental-science.jpg",
  },
];
const heroReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const defaultUser = {
  loggedIn: false,
  name: "Guest",
  email: "guest@structoria.com",
  emailUpdates: true,
  plan: "free",
};
const sessionStorageKey = "structoria-session-token";
let currentUser = { ...defaultUser };
let pendingCoursePath = null;
let authenticationInitialized = false;

const civilEngineeringPathway = {
  name: "Civil Engineering",
  icon: "🏗️",
  description: "Build your knowledge from core civil engineering subjects to practical design topics.",
  children: [
    {
    name: "Structural Engineering",
    open: true,
    children: [
      {
        name: "Structural Analysis",
        children: [
          { name: "Statics and Mechanics of Materials" },
          { name: "Determinate Structures" },
          { name: "Indeterminate Structures" },
          { name: "Matrix and Finite Element Analysis" },
          { name: "Structural Dynamics and Earthquake Engineering" },
          { name: "Design Philosophies" },
        ],
      },
      {
        name: "Reinforced Concrete (RC) Design",
        children: [
          {
            name: "Flexural Members (Beams)",
            children: [
              { name: "Singly Reinforced Rectangular Beams" },
              { name: "Doubly Reinforced Rectangular Beams" },
              {
                name: "Flanged Sections (T-Beams and L-Beams)",
                children: [{ name: "T-Beams" }, { name: "L-Beams" }],
              },
              {
                name: "Deep Beams and Continuous Beams",
                children: [{ name: "Deep Beams" }, { name: "Continuous Beams" }],
              },
              { name: "Shear Design, Stirrup Spacing and Torsional Reinforcement" },
            ],
          },
          {
            name: "Compression Members (Columns)",
            children: [
              {
                name: "Columns in Braced Frames (Non-Sway)",
                icon: "🏢",
                description: "Choose this case when a separate bracing system or core controls the frame's sideways movement.",
              },
              {
                name: "Columns in Unbraced Frames (Sway)",
                icon: "↔️",
                description: "Choose this case when the frame itself can sway under lateral load, such as wind.",
              },
            ],
          },
          {
            name: "Slabs (Floor Systems)",
            children: [
              {
                name: "One-Way Solid Slab",
                slabDesignType: "oneWay",
                description: "Design a uniformly loaded one-way slab using the supplied coefficient-table workbook.",
              },
              {
                name: "Two-Way Slab",
                slabDesignType: "twoWay",
                description: "Design a rectangular two-way panel with one of the workbook's supported edge conditions.",
              },
              {
                name: "Simply Supported Two-Way Slab",
                slabDesignType: "simplySupported",
                description: "Design a simply supported two-way panel with free or restrained corners.",
              },
              { name: "Cantilever Slabs" },
              {
                name: "Flat Slabs",
                children: [{ name: "With Drops or Column Heads" }, { name: "Without Drops or Column Heads" }],
              },
              { name: "Waffle Slabs" },
              { name: "Ribbed Slabs/Joist Systems" },
            ],
          },
          {
            name: "Foundation and Substructure",
            children: [
              {
                name: "Pad Footing",
                children: [{ name: "Isolated Square Footing" }, { name: "Isolated Rectangular Footing" }],
              },
              {
                name: "Combined Footing",
                children: [{ name: "Rectangular Footing" }, { name: "Trapezoidal Footing" }],
              },
              { name: "Strip/Wall Footing" },
              { name: "Raft/Mat Foundations" },
              { name: "Pile Caps and Deep Pile Foundations" },
            ],
          },
          {
            name: "Earth Retaining Structures",
            children: [
              { name: "Cantilever Retaining Walls" },
              { name: "Counterfort Retaining Walls" },
              { name: "Gravity and Basement Walls" },
            ],
          },
          {
            name: "Staircase Design",
            children: [{ name: "Doglegged" }, { name: "Open-Newel" }, { name: "Cantilever" }],
          },
          {
            name: "Water Tanks",
            children: [{ name: "Circular" }, { name: "Rectangular" }, { name: "Underground" }, { name: "Elevated" }],
          },
          { name: "Corbels" },
          { name: "Brackets" },
          { name: "Shear Wall" },
        ],
      },
      {
        name: "Steel Design",
        children: [
          {
            name: "Connections",
            children: [
              { name: "Bolted" },
              { name: "Riveted" },
              {
                name: "Welded Connections",
                children: [{ name: "Eccentric" }, { name: "Concentric" }],
              },
            ],
          },
          {
            name: "Tension Members",
            children: [{ name: "Net Area Calculations" }, { name: "Block Shear Failure" }, { name: "Lug Angles" }],
          },
          {
            name: "Compression Members",
            children: [
              { name: "Column Buckling Curves" },
              { name: "Built-Up Sections" },
              { name: "Laced Columns" },
              { name: "Battened Columns" },
            ],
          },
          {
            name: "Flexural Members",
            children: [
              { name: "Laterally Supported Beams" },
              { name: "Unsupported Beams" },
              { name: "Web Buckling" },
              { name: "Web Crippling" },
            ],
          },
          {
            name: "Plate Girders",
            children: [{ name: "Stiffeners" }, { name: "Splices" }],
          },
          { name: "Gantry Girders" },
          {
            name: "Roof Trusses",
            children: [{ name: "Purlins" }, { name: "Sag Rods" }],
          },
          { name: "Plastic Analysis of Steel Frame" },
        ],
      },
      {
        name: "Timber Design",
        children: [
          { name: "Grade Stresses" },
          { name: "Column Design" },
          { name: "Joist" },
          { name: "Timber Connection Configuration" },
        ],
      },
      {
        name: "Masonry Design",
        children: [
          { name: "Load-Bearing Walls" },
          { name: "Brickwork Stability" },
          { name: "Reinforced Masonry Lintel" },
        ],
      },
    ],
  },
  {
    name: "Geotechnical Engineering",
    children: [{ name: "Soil Mechanics" }, { name: "Foundation Engineering" }],
  },
  {
    name: "Transport Engineering",
    children: [
      { name: "Transportation Planning and Traffic Engineering" },
      { name: "Geometric Design of Highway" },
      {
        name: "Pavement Materials",
        children: [
          {
            name: "Pavement Design",
            children: [{ name: "Flexible Pavement" }, { name: "Rigid Pavement" }],
          },
        ],
      },
      { name: "Railway and Airport Engineering" },
    ],
  },
  {
    name: "Water Engineering",
    children: [
      { name: "Fluid Mechanics" },
      { name: "Hydrology" },
      { name: "Water Supply and Wastewater" },
      { name: "Hydraulic Structures" },
      { name: "Water Resource Management" },
    ],
  },
  ],
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

function findCivilEngineeringTopic(path) {
  return path.slice(1).reduce((topic, name) => {
    return topic?.children?.find((child) => child.name === name);
  }, civilEngineeringPathway);
}

function getDisciplineTheme(path) {
  const subject = (path[1] || "").toLowerCase();
  if (subject.includes("structural") || subject.includes("concrete")) return "structural";
  if (subject.includes("geotechnical") || subject.includes("foundation")) return "geotechnical";
  if (subject.includes("transport")) return "transport";
  if (subject.includes("water") || subject.includes("hydraulic")) return "water";
  if (subject.includes("environment")) return "environment";
  if (subject.includes("survey")) return "survey";
  return "civil";
}

function getTopicIcon(topic, index) {
  const knownIcons = {
    "Structural Engineering": "🏗️",
    "Structural Analysis": "📐",
    "Reinforced Concrete (RC) Design": "🧱",
    "Flexural Members (Beams)": "〰️",
    "Compression Members (Columns)": "🏛️",
    "Columns in Braced Frames (Non-Sway)": "🏢",
    "Columns in Unbraced Frames (Sway)": "↔️",
    "Slabs (Floor Systems)": "▦",
    "Two-Way Slab": "▤",
    "Foundation and Substructure": "🪨",
    "Earth Retaining Structures": "⛰️",
    "Staircase Design": "🪜",
    "Water Tanks": "💧",
    "Steel Design": "🔩",
    "Timber Design": "🪵",
    "Masonry Design": "🧱",
    "Geotechnical Engineering": "🌍",
    "Transport Engineering": "🛣️",
    "Water Engineering": "🌊",
    "Pavement Materials": "🛤️",
    "Pavement Design": "🚧",
    "Flexible Pavement": "🛣️",
    "Rigid Pavement": "🧱",
    "Fluid Mechanics": "💦",
    "Hydrology": "🌧️",
    "Water Supply and Wastewater": "🚰",
    "Hydraulic Structures": "🌉",
  };
  return knownIcons[topic.name] ?? ["📐", "🏗️", "🧰", "📘"][index % 4];
}

function getTopicDescription(topic) {
  if (topic.description) return topic.description;
  if (topic.children?.length) {
    return `Explore ${topic.children.length} learning ${topic.children.length === 1 ? "topic" : "topics"} in ${topic.name}.`;
  }
  return `Explore the key principles and design considerations for ${topic.name.toLowerCase()}.`;
}

function createColumnCaseIllustration(caseName) {
  const isBraced = caseName === "Columns in Braced Frames (Non-Sway)";
  const figure = document.createElement("span");
  figure.className = `column-case-art ${isBraced ? "is-braced" : "is-unbraced"}`;

  const svgMarkup = isBraced
    ? `<svg viewBox="0 0 260 175" role="img" aria-label="Two-storey frame with diagonal cross-bracing resisting sideways movement">
        <title>Braced frame resists lateral sway</title>
        <path class="frame-member" d="M42 22V145M112 22V145M182 22V145M42 22H182M42 62H182M42 103H182M42 145H182"/>
        <path class="brace-member" d="M112 22L182 62M182 22L112 62M112 62L182 103M182 62L112 103M112 103L182 145M182 103L112 145"/>
        <path class="force-arrow" d="M8 38H35M28 31L35 38L28 45"/>
        <text class="diagram-label" x="8" y="24">side force</text>
        <text class="diagram-label" x="45" y="163">bracing limits frame drift</text>
      </svg>`
    : `<svg viewBox="0 0 260 175" role="img" aria-label="Unbraced two-storey frame leaning sideways under a lateral force">
          <title>Unbraced frame sways under lateral load</title>
          <path class="reference-member" d="M42 22V145M112 22V145M182 22V145M42 22H182M42 62H182M42 103H182M42 145H182"/>
        <path class="frame-member" d="M42 145L55 103L70 62L83 22M112 145L125 103L140 62L153 22M182 145L195 103L210 62L223 22M55 103L195 103M70 62L210 62M83 22L223 22M42 145H182"/>
        <path class="force-arrow" d="M8 38H35M28 31L35 38L28 45"/>
        <path class="drift-arrow" d="M45 31H80M73 24L80 31L73 38"/>
        <text class="diagram-label" x="8" y="24">side force</text>
        <text class="diagram-label" x="45" y="163">frame joints drift sideways</text>
      </svg>`;
  figure.innerHTML = `${svgMarkup}<span class="column-case-caption">${isBraced
    ? "Bracing limits sideways drift; columns still carry axial load and bending."
    : "The moment frame sways under side load; this drift affects column design."}</span><span class="column-case-note">Concept sketch · not to scale</span>`;
  return figure;
}

function addColumnFormField(container, field, optional = false) {
  const label = document.createElement("label");
  label.className = "column-form-field";
  label.htmlFor = `column-input-${field.key}`;

  const labelText = document.createElement("span");
  labelText.className = "column-form-label";
  labelText.textContent = field.label;

  const input = document.createElement(field.type === "select" ? "select" : "input");
  input.id = `column-input-${field.key}`;
  input.name = field.key;
  if (field.type === "select") {
    field.options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      input.append(option);
    });
  } else {
    input.type = optional ? "text" : "number";
    if (!optional) {
      input.min = field.min ?? "";
      input.max = field.max ?? "";
      input.step = field.step ?? (field.integer ? "1" : "any");
      input.required = true;
    }
  }
  input.value = field.value ?? "";

  const meta = document.createElement("small");
  meta.className = "column-form-meta";
  meta.textContent = optional ? field.cell : `${field.cell}${field.unit ? ` · ${field.unit}` : ""}`;
  label.append(labelText, input, meta);
  container.append(label);
}

function renderColumnDesignForm() {
  columnDesignGroups.forEach((group) => {
    const section = document.createElement("fieldset");
    section.className = "column-input-group";
    const legend = document.createElement("legend");
    legend.textContent = group.title;
    const grid = document.createElement("div");
    grid.className = "column-input-grid";
    group.fields.forEach((field) => addColumnFormField(grid, field));
    section.append(legend, grid);
    columnDesignInputs.append(section);
  });
  columnTitleFields.forEach((field) => addColumnFormField(columnTitleBlock, field, true));
}

function readColumnFormValues(fields, formData, numeric = false) {
  return Object.fromEntries(fields.map((field) => {
    const value = formData.get(field.key);
    return [field.key, numeric && !field.type ? Number(value) : value];
  }));
}

function renderColumnResults(result) {
  document.querySelector("#column-design-status").textContent = result.status;
  document.querySelector("#column-design-status").className =
    result.status === "DESIGN ADEQUATE" ? "design-status is-adequate" : "design-status is-review";

  const summary = document.querySelector("#column-summary-results");
  summary.replaceChildren();
  result.summary.forEach((item) => {
    const card = document.createElement("article");
    card.className = "column-result-card";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    card.append(label, value);
    summary.append(card);
  });

  const checks = document.querySelector("#column-check-results");
  checks.replaceChildren();
  result.checks.forEach((item) => {
    const row = document.createElement("tr");
    [item.name, item.demand, item.capacity, item.ratio, item.status].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "—";
      row.append(cell);
    });
    row.lastElementChild.className =
      item.status === "OK" ? "check-ok" : item.status === "N/A" ? "check-na" : "check-review";
    checks.append(row);
  });

  columnDesignResults.hidden = false;
}

function addSlabFormField(container, field, optional = false) {
  const label = document.createElement("label");
  label.className = "column-form-field";
  label.htmlFor = `slab-input-${field.key}`;

  const labelText = document.createElement("span");
  labelText.className = "column-form-label";
  labelText.textContent = field.label;

  const input = document.createElement(field.type === "select" ? "select" : "input");
  input.id = `slab-input-${field.key}`;
  input.name = field.key;
  if (field.type === "select") {
    field.options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      input.append(option);
    });
  } else {
    input.type = optional ? "text" : "number";
    if (!optional) {
      input.min = field.min ?? "";
      input.max = field.max ?? "";
      input.step = field.step ?? (field.integer ? "1" : "any");
      input.required = true;
    }
  }
  input.value = field.value ?? "";

  const meta = document.createElement("small");
  meta.className = "column-form-meta";
  meta.textContent = optional ? field.cell : (field.unit ? field.unit : "Enter project value");
  label.append(labelText, input, meta);
  container.append(label);
}

function renderSlabDesignForm(slabType) {
  currentSlabType = slabType;
  latestSlabResult = null;
  latestSlabInputs = null;
  latestSlabTitleBlock = null;
  slabDesignResults.hidden = true;
  slabDownloadPdf.disabled = true;
  slabCalculationState.textContent = "";
  slabDesignInputs.replaceChildren();
  slabTitleBlock.replaceChildren();
  const slabTypeLabels = {
    oneWay: "One-way solid slab",
    twoWay: "Two-way slab panel",
    simplySupported: "Simply supported two-way slab",
  };
  document.querySelector("#slab-designer-title").textContent = `${slabTypeLabels[slabType]} design inputs`;

  slabDesignGroups[slabType].forEach((group) => {
    const section = document.createElement("fieldset");
    section.className = "column-input-group";
    section.dataset.slabGroupTitle = group.title;
    const legend = document.createElement("legend");
    legend.textContent = group.title;
    const grid = document.createElement("div");
    grid.className = "column-input-grid";
    group.fields.forEach((field) => addSlabFormField(grid, field));
    section.append(legend, grid);
    slabDesignInputs.append(section);
  });
  slabTitleFields.forEach((field) => addSlabFormField(slabTitleBlock, field, true));

  const supportCondition = slabDesignForm.elements.supportCondition;
  const continuousSpanGroup = slabDesignInputs.querySelector(
    '[data-slab-group-title="Continuous-span method preconditions"]',
  );
  if (supportCondition && continuousSpanGroup) {
    const updateContinuousSpanFields = () => {
      const isApplicable = supportCondition.value !== "Simply supported";
      continuousSpanGroup.hidden = !isApplicable;
      continuousSpanGroup.querySelectorAll("input, select").forEach((input) => {
        input.disabled = !isApplicable;
      });
    };
    supportCondition.addEventListener("change", updateContinuousSpanFields);
    updateContinuousSpanFields();
  }
}

function readSlabFormValues(fields, formData, titleBlock = false) {
  return Object.fromEntries(fields.map((field) => {
    const value = formData.get(field.key);
    if (value === null) return [field.key, undefined];
    if (titleBlock) return [field.key, value || ""];
    return [field.key, field.type === "select" && !field.numeric ? value : Number(value)];
  }).filter(([, value]) => value !== undefined));
}

function appendSlabTableRow(body, values, className = "") {
  const row = document.createElement("tr");
  if (className) row.className = className;
  values.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value || "—";
    row.append(cell);
  });
  body.append(row);
  return row;
}

function renderSlabResults(result) {
  const status = document.querySelector("#slab-design-status");
  status.textContent = result.status;
  status.className = result.status.startsWith("DESIGN ADEQUATE")
    ? "design-status is-adequate"
    : "design-status is-review";
  document.querySelector("#slab-method-statement").textContent = result.methodStatement;
  document.querySelector("#slab-method-comparison").textContent = result.methodComparison;

  const summary = document.querySelector("#slab-summary-results");
  summary.replaceChildren();
  result.summary.forEach((item) => {
    const card = document.createElement("article");
    card.className = "column-result-card";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = `${item.value}${item.unit ? ` ${item.unit}` : ""}`;
    card.append(label, value);
    summary.append(card);
  });

  const checks = document.querySelector("#slab-check-results");
  checks.replaceChildren();
  result.checks.forEach((item) => {
    const row = appendSlabTableRow(checks, [
      item.name, item.demand, item.capacity, item.ratio, item.status,
    ]);
    row.lastElementChild.className =
      item.status === "OK" ? "check-ok" : item.status === "N/A" ? "check-na" : "check-review";
  });

  const calculationSections = document.querySelector("#slab-calculation-sections");
  calculationSections.replaceChildren();
  result.calculationSections.forEach((section, index) => {
    const details = document.createElement("details");
    details.className = "slab-step";
    details.open = index === 0;
    const summaryLine = document.createElement("summary");
    summaryLine.textContent = `${index + 1}. ${section.title}`;
    details.append(summaryLine);
    const description = document.createElement("p");
    description.textContent = section.description;
    details.append(description);

    if (section.rows?.length) {
      const wrap = document.createElement("div");
      wrap.className = "column-check-table-wrap";
      const table = document.createElement("table");
      table.className = "column-check-table slab-data-table";
      table.innerHTML = "<thead><tr><th>Calculation item</th><th>Calculated value</th><th>Code reference</th><th>Working / note</th></tr></thead>";
      const body = document.createElement("tbody");
      section.rows.forEach((item) => {
        const values = Object.entries(item.values || {})
          .map(([axis, value]) => `${axis === "Value" ? "" : `${axis}: `}${value}${item.unit ? ` ${item.unit}` : ""}`)
          .join(" · ");
        appendSlabTableRow(body, [
          item.label,
          values,
          item.reference,
          [item.working, item.note].filter(Boolean).join(" · "),
        ]);
      });
      table.append(body);
      wrap.append(table);
      details.append(wrap);
    }

    if (section.table) {
      const wrap = document.createElement("div");
      wrap.className = "column-check-table-wrap";
      const table = document.createElement("table");
      table.className = "column-check-table slab-data-table";
      const head = document.createElement("thead");
      const headerRow = document.createElement("tr");
      [section.table.label || "Calculation item", ...section.table.columns, "Code reference"].forEach((heading) => {
        const cell = document.createElement("th");
        cell.textContent = heading;
        headerRow.append(cell);
      });
      head.append(headerRow);
      const body = document.createElement("tbody");
      section.table.rows.forEach((item) =>
        appendSlabTableRow(body, [item.label, ...item.values, item.reference]),
      );
      table.append(head, body);
      wrap.append(table);
      details.append(wrap);
    }
    calculationSections.append(details);
  });

  const reinforcement = document.querySelector("#slab-reinforcement");
  reinforcement.replaceChildren();
  result.reinforcement.forEach((item) => appendSlabTableRow(reinforcement, [
    item.mark, item.description, item.tag, item.placing,
  ]));

  const schedule = document.querySelector("#slab-bar-schedule");
  schedule.replaceChildren();
  result.barSchedule.forEach((item) => appendSlabTableRow(schedule, [
    item.mark, item.location, item.barType, item.numberEach, item.numberOfMembers,
    item.totalBars, item.shapeCode, item.dimensionA, item.dimensionB, item.lengthEach, item.mass,
  ]));
  document.querySelector("#slab-schedule-note").textContent = result.scheduleNote;

  const quantities = document.querySelector("#slab-quantities");
  quantities.replaceChildren();
  result.quantities.forEach((item) => {
    const card = document.createElement("article");
    card.className = "column-result-card";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = `${item.value}${item.unit ? ` ${item.unit}` : ""}`;
    card.append(label, value);
    quantities.append(card);
  });

  const notes = document.querySelector("#slab-scope-notes");
  notes.replaceChildren();
  result.scopeNotes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  document.querySelector("#slab-pdf-availability").textContent =
    "The complete calculation record is ready. Print it or choose Save as PDF in the print dialog.";
  slabDesignResults.hidden = false;
}

async function submitSlabDesign(event) {
  event.preventDefault();
  if (location.protocol === "file:") {
    slabCalculationState.textContent =
      "Open Structoria through the backend server. Do not open index.html directly from disk.";
    return;
  }

  slabCalculateButton.disabled = true;
  slabDownloadPdf.disabled = true;
  slabCalculationState.textContent = "Calculating with the workbook-derived slab design service…";
  slabDesignResults.hidden = true;
  try {
    const formData = new FormData(slabDesignForm);
    const designFields = slabDesignGroups[currentSlabType].flatMap((group) => group.fields);
    const designInputs = readSlabFormValues(designFields, formData);
    const titleBlock = readSlabFormValues(slabTitleFields, formData, true);
    const payload = await apiRequest("/api/calculate/rc-slab", {
      method: "POST",
      body: JSON.stringify({ slabType: currentSlabType, inputs: designInputs, titleBlock }),
    });

    latestSlabResult = payload;
    latestSlabInputs = designInputs;
    latestSlabTitleBlock = titleBlock;
    renderSlabResults(payload);
    slabDownloadPdf.disabled = false;
    slabCalculationState.textContent = "Calculation complete. Review every check and stated assumption before using the report.";
  } catch (error) {
    slabCalculationState.textContent =
      error.message || "Calculation could not connect to the Structoria slab design service.";
  } finally {
    slabCalculateButton.disabled = false;
  }
}

function printSlabReport() {
  if (!latestSlabResult || !latestSlabInputs || !latestSlabTitleBlock) return;
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    slabCalculationState.textContent = "Allow pop-ups for this site to open the printable design report.";
    return;
  }

  try {
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
    const tableRows = (rows, cells) => rows.map((row) =>
      `<tr>${cells(row).map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`
    ).join("");
    const inputSections = latestSlabResult.inputGroups.map((group) => `
      <section class="report-section">
        <h2>${escapeHtml(group.title)}</h2>
        <table class="summary-table"><tbody>${group.fields.map((field) => `
          <tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(`${field.value}${field.unit ? ` ${field.unit}` : ""}`)}</td></tr>
        `).join("")}</tbody></table>
      </section>
    `).join("");
    const titleRows = slabTitleFields
      .filter((field) => latestSlabTitleBlock[field.key])
      .map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(latestSlabTitleBlock[field.key])}</td></tr>`)
      .join("");
    const summaryRows = latestSlabResult.summary.map((item) =>
      `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(`${item.value}${item.unit ? ` ${item.unit}` : ""}`)}</td></tr>`
    ).join("");
    const checkRows = tableRows(latestSlabResult.checks, (item) => [
      item.name, item.demand, item.capacity, item.ratio, item.status,
    ]);
    const calculationSections = latestSlabResult.calculationSections.map((section, index) => {
      let table;
      if (section.table) {
        const headers = [section.table.label || "Calculation item", ...section.table.columns, "Code reference"]
          .map((heading) => `<th>${escapeHtml(heading)}</th>`).join("");
        const rows = tableRows(section.table.rows, (item) => [
          item.label, ...item.values, item.reference,
        ]);
        table = `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
      } else {
        const rows = tableRows(section.rows || [], (item) => [
          item.label,
          `${Object.entries(item.values || {}).map(([axis, value]) => `${axis === "Value" ? "" : `${axis}: `}${value}${item.unit ? ` ${item.unit}` : ""}`).join(" · ") || "—"}`,
          item.reference || "",
          [item.working, item.note].filter(Boolean).join(" · "),
        ]);
        table = `<table><thead><tr><th>Calculation item</th><th>Calculated value</th><th>Code reference</th><th>Working / note</th></tr></thead><tbody>${rows}</tbody></table>`;
      }
      return `<section class="report-section"><h2>${index + 1}. ${escapeHtml(section.title)}</h2><p class="section-note">${escapeHtml(section.description)}</p>${table}</section>`;
    }).join("");
    const reinforcementRows = tableRows(latestSlabResult.reinforcement, (item) => [
      item.mark, item.description, item.tag, item.placing,
    ]);
    const scheduleRows = tableRows(latestSlabResult.barSchedule, (item) => [
      item.mark, item.location, item.barType,
      `${item.numberEach} / ${item.numberOfMembers} / ${item.totalBars}`,
      item.shapeCode, item.dimensionA, item.dimensionB, item.lengthEach, item.mass,
    ]);
    const quantityRows = latestSlabResult.quantities.map((item) =>
      `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(`${item.value}${item.unit ? ` ${item.unit}` : ""}`)}</td></tr>`
    ).join("");
    const scopeNotes = latestSlabResult.scopeNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
    const title = latestSlabTitleBlock.projectTitle || "RC Slab Design Report";
    const statusColor = latestSlabResult.status.startsWith("DESIGN ADEQUATE") ? "#147346" : "#a13328";
    const statusBackground = latestSlabResult.status.startsWith("DESIGN ADEQUATE") ? "#e9f6ee" : "#fff0ed";
    const shortSpan = latestSlabTypeIsOneWay()
      ? latestSlabInputs.span
      : latestSlabInputs.shortSpan;
    const longSpan = latestSlabTypeIsOneWay()
      ? latestSlabInputs.spanAlongSupports
      : latestSlabInputs.longSpan;
    const sketch = `
      <svg viewBox="0 0 640 340" role="img" aria-label="Conceptual slab reinforcement direction sketch">
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#244d8f"/></marker></defs>
        <rect x="115" y="52" width="410" height="210" fill="#f8fbff" stroke="#1b2b48" stroke-width="4"/>
        <path d="M150 90H490M150 125H490M150 160H490M150 195H490M150 230H490" stroke="#3974bd" stroke-width="2" opacity=".8"/>
        <path d="M190 70V244M255 70V244M320 70V244M385 70V244M450 70V244" stroke="#d16b56" stroke-width="1.5" opacity=".7"/>
        <path d="M150 284H490" stroke="#244d8f" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <path d="M92 75V238" stroke="#244d8f" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="320" y="308" text-anchor="middle" font-size="15" fill="#243764">Lx = ${escapeHtml(shortSpan)} m · B1 bottom bars</text>
        <text x="50" y="158" text-anchor="middle" transform="rotate(-90 50 158)" font-size="15" fill="#243764">Ly = ${escapeHtml(longSpan)} m · B2 bottom bars</text>
      </svg>
    `;
    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html>
      <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(title)} - Structoria Slab Design Report</title>
      <style>
        *{box-sizing:border-box}
        body{font:9.5pt/1.45 Arial,Helvetica,sans-serif;color:#17263d;margin:28px auto;max-width:980px;padding:0 24px;background:#fff}
        h1{font-size:23pt;line-height:1.15;margin:0 0 5px;color:#16345a}
        h2{font-size:13pt;margin:20px 0 6px;color:#23486d;break-after:avoid}
        p{margin:4px 0 10px;color:#526174}
        .report-kicker{font-size:8pt;letter-spacing:.08em;text-transform:uppercase;color:#46668b;font-weight:700}
        .report-subtitle{margin-bottom:16px}
        .report-toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:10px;padding:10px 0;background:#fff}
        .report-toolbar button{border:0;border-radius:6px;padding:10px 14px;font-weight:700;cursor:pointer;background:#234bd8;color:white}
        .report-toolbar .secondary{background:#edf1f7;color:#273852}
        .report-section{margin:17px 0 0}
        .section-note{font-size:9pt;margin:0 0 8px}
        .status{display:inline-block;margin:8px 0 12px;padding:7px 11px;border-radius:5px;font-weight:700;color:${statusColor};background:${statusBackground}}
        table{width:100%;border-collapse:collapse;margin:8px 0 14px;table-layout:auto;font-size:8pt}
        th,td{border:1px solid #d5deea;padding:5px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
        thead{display:table-header-group}
        th{background:#f0f4f9;font-weight:700}
        .summary-table th{width:36%}
        .report-sketch{max-width:560px;margin:12px auto;text-align:center}
        .report-sketch svg{width:100%;height:auto}
        .report-sketch figcaption{font-size:8pt;color:#66758a}
        .scope-notes{padding-left:20px;font-size:8.5pt}
        .scope-notes li{margin:4px 0}
        .engineering-note{border-top:1px solid #d5deea;margin-top:22px;padding-top:10px;font-size:8.5pt}
        @page{size:A4 portrait;margin:13mm 10mm 15mm}
        @media print{
          body{margin:0;max-width:none;padding:0;background:#fff;font-size:8.5pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .report-toolbar{display:none}
          .report-section{margin-top:12px}
          h1{font-size:20pt}
          h2{font-size:10.5pt;margin-top:15px}
          tr{break-inside:avoid}
          .engineering-note{break-inside:avoid}
        }
        @media screen and (max-width:600px){body{margin:12px auto;padding:0 12px;font-size:9pt}h1{font-size:20pt}table{font-size:7.5pt}th,td{padding:4px}}
      </style></head><body>
      <div class="report-toolbar"><button type="button" class="secondary" onclick="window.close()">Close report</button><button type="button" onclick="window.print()">Print / save as PDF</button></div>
      <p class="report-kicker">Structoria | Reinforced-concrete slab | Student calculation record</p>
      <h1>${escapeHtml(title)}</h1><p class="report-subtitle">${escapeHtml(latestSlabResult.slabTypeLabel)} · complete workbook-derived design report</p>
      ${titleRows ? `<section class="report-section"><h2>Project and drawing information</h2><table class="summary-table"><tbody>${titleRows}</tbody></table></section>` : ""}
      <p>Generated ${escapeHtml(new Date().toLocaleString())} by the Structoria slab design service.</p>
      <p class="status">${escapeHtml(latestSlabResult.status)}</p>
      <p><strong>Design basis:</strong> ${escapeHtml(latestSlabResult.methodStatement)}</p>
      <section class="report-section"><h2>1. Design summary</h2><table class="summary-table"><tbody>${summaryRows}</tbody></table></section>
      <figure class="report-sketch">${sketch}<figcaption>Conceptual direction sketch only; not to scale. Use the bar-mark schedule and placing notes for reinforcement extents.</figcaption></figure>
      <section class="report-section"><h2>2. Design inputs and assumptions</h2>${inputSections}</section>
      <section class="report-section"><h2>3. Final design checks</h2><table><thead><tr><th>Check</th><th>Demand</th><th>Capacity / limit</th><th>Ratio</th><th>Status</th></tr></thead><tbody>${checkRows}</tbody></table></section>
      <section class="report-section"><h2>4. Calculation stages and intermediate results</h2><p class="section-note">The sections below follow the workbook sequence and retain its intermediate values, working expressions and code references.</p>${calculationSections}</section>
      <section class="report-section"><h2>5. Reinforcement tags and placing notes</h2><table><thead><tr><th>Mark</th><th>Description / layer</th><th>Reinforcement tag</th><th>Extent / placing</th></tr></thead><tbody>${reinforcementRows}</tbody></table></section>
      <section class="report-section"><h2>6. Bar bending schedule</h2><table><thead><tr><th>Mark</th><th>Member / location</th><th>Type &amp; size</th><th>No. each / members / total</th><th>Shape</th><th>A (mm)</th><th>B (mm)</th><th>Length each (mm)</th><th>Mass (kg)</th></tr></thead><tbody>${scheduleRows}</tbody></table><p class="section-note">${escapeHtml(latestSlabResult.scheduleNote)}</p></section>
      <section class="report-section"><h2>7. Quantities and material summary</h2><table class="summary-table"><tbody>${quantityRows}</tbody></table></section>
      <section class="report-section"><h2>8. Method comparison and scope notes</h2><p>${escapeHtml(latestSlabResult.methodComparison)}</p><ul class="scope-notes">${scopeNotes}</ul></section>
      <p class="engineering-note">Educational design aid only. The responsible structural engineer must independently verify design assumptions, loading, code applicability, detailing, limitations and results before use or issue.</p>
      </body></html>`);
    reportWindow.document.close();
    window.setTimeout(() => {
      if (!reportWindow.closed) {
        reportWindow.focus();
        reportWindow.print();
      }
    }, 250);
    slabCalculationState.textContent = "Report opened. In the print dialog, select Save as PDF as the destination.";
  } catch (error) {
    reportWindow.close();
    slabCalculationState.textContent = error.message || "Unable to open the slab design report.";
  }
}

function latestSlabTypeIsOneWay() {
  return latestSlabResult?.slabType === "oneWay";
}

async function submitColumnDesign(event) {
  event.preventDefault();
  if (location.protocol === "file:") {
    columnCalculationState.textContent =
      "Open Structoria through the backend server. Do not open index.html directly from disk.";
    return;
  }

  columnCalculateButton.disabled = true;
  columnDownloadPdf.disabled = true;
  columnCalculationState.textContent = "Calculating with the Structoria design service…";
  columnDesignResults.hidden = true;
  try {
    const formData = new FormData(columnDesignForm);
    const designFields = columnDesignGroups.flatMap((group) => group.fields);
    const designInputs = readColumnFormValues(designFields, formData, true);
    const titleBlock = readColumnFormValues(columnTitleFields, formData);
    const payload = await apiRequest("/api/calculate/rc-column", {
      method: "POST",
      body: JSON.stringify({ inputs: designInputs, titleBlock }),
    });

    latestColumnResult = payload;
    latestColumnInputs = designInputs;
    latestColumnTitleBlock = titleBlock;
    renderColumnResults(payload);
    columnDownloadPdf.disabled = false;
    document.querySelector("#column-pdf-availability").textContent =
      "Your complete design report is ready. Print it or choose Save as PDF in the print dialog.";
    columnCalculationState.textContent = "Calculation complete. Results are generated by the Structoria backend.";
  } catch (error) {
    columnCalculationState.textContent =
      error.message || "Calculation could not connect to the Structoria design service.";
  } finally {
    columnCalculateButton.disabled = false;
  }
}

function printColumnReport() {
  if (!latestColumnResult || !latestColumnInputs || !latestColumnTitleBlock) return;
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    columnCalculationState.textContent = "Allow pop-ups for this site to open the printable design report.";
    return;
  }

  try {
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
    const inputSections = columnDesignGroups.map((group) => `
      <section>
        <h2>${escapeHtml(group.title)}</h2>
        <table><tbody>${group.fields.map((field) => `
          <tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(latestColumnInputs[field.key])}${field.unit ? ` ${escapeHtml(field.unit)}` : ""}</td></tr>
        `).join("")}</tbody></table>
      </section>
    `).join("");
    const optionalTitleBlock = columnTitleFields
      .filter((field) => latestColumnTitleBlock[field.key])
      .map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(latestColumnTitleBlock[field.key])}</td></tr>`)
      .join("");
    const summaryRows = latestColumnResult.summary
      .map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`)
      .join("");
    const checkRows = latestColumnResult.checks
      .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.demand)}</td><td>${escapeHtml(item.capacity)}</td><td>${escapeHtml(item.ratio)}</td><td>${escapeHtml(item.status)}</td></tr>`)
      .join("");
    const calculationSections = latestColumnResult.calculationSteps
      .map((section, index) => {
        const rows = section.rows.map((item) => {
          const values = [item.value, item.secondaryValue]
            .filter(Boolean)
            .map((value) => escapeHtml(value))
            .join(" <span class=\"axis-separator\">|</span> ");
          const value = item.unit
            ? `${values} <span class="unit">${escapeHtml(item.unit)}</span>`
            : values;
          return `<tr><th>${escapeHtml(item.label)}</th><td>${value}</td></tr>`;
        }).join("");
        return `<section class="report-section"><h2>${index + 1}. ${escapeHtml(section.title)}</h2><p class="section-note">${escapeHtml(section.description)}</p><table class="calculation-table"><thead><tr><th>Design calculation</th><th>Calculated value</th></tr></thead><tbody>${rows}</tbody></table></section>`;
      })
      .join("");
    const title = latestColumnTitleBlock.projectTitle || "RC Column Design Report";
    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html>
      <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(title)} - Structoria Design Report</title>
      <style>
        *{box-sizing:border-box}
        body{font:10pt/1.45 Arial,Helvetica,sans-serif;color:#17263d;margin:28px auto;max-width:900px;padding:0 24px;background:#fff}
        h1{font-size:23pt;line-height:1.15;margin:0 0 5px;color:#16345a}
        h2{font-size:13pt;margin:24px 0 6px;color:#23486d;break-after:avoid}
        p{margin:4px 0 10px;color:#526174}
        .report-kicker{font-size:8pt;letter-spacing:.08em;text-transform:uppercase;color:#46668b;font-weight:700}
        .report-subtitle{margin-bottom:16px}
        .report-toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:10px;padding:10px 0;background:#fff}
        .report-toolbar button{border:0;border-radius:6px;padding:10px 14px;font-weight:700;cursor:pointer;background:#234bd8;color:white}
        .report-toolbar .secondary{background:#edf1f7;color:#273852}
        .report-section{margin:20px 0 0}
        .section-note{font-size:9pt;margin:0 0 8px}
        .status{display:inline-block;margin:8px 0 12px;padding:7px 11px;border-radius:5px;font-weight:700;color:${latestColumnResult.status === "DESIGN ADEQUATE" ? "#147346" : "#a13328"};background:${latestColumnResult.status === "DESIGN ADEQUATE" ? "#e9f6ee" : "#fff0ed"}}
        table{width:100%;border-collapse:collapse;margin:8px 0 16px;table-layout:auto}
        th,td{border:1px solid #d5deea;padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
        thead{display:table-header-group}
        th{background:#f0f4f9;font-weight:700}
        .summary-table th{width:36%}
        .calculation-table th:first-child{width:62%}
        .check-table{font-size:8.5pt}
        .check-table th,.check-table td{padding:5px 6px}
        .check-table td:last-child{font-weight:700}
        .axis-separator{padding:0 5px;color:#73829a}
        .unit{color:#596a82;white-space:nowrap}
        .engineering-note{border-top:1px solid #d5deea;margin-top:24px;padding-top:12px;font-size:8.5pt}
        @page{size:A4 portrait;margin:14mm 12mm 16mm}
        @media print{
          body{margin:0;max-width:none;padding:0;background:#fff;font-size:9pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .report-toolbar{display:none}
          .report-section{margin-top:14px}
          h1{font-size:20pt}
          h2{font-size:11pt;margin-top:17px}
          tr{break-inside:avoid}
          .engineering-note{break-inside:avoid}
        }
        @media screen and (max-width:600px){
          body{margin:12px auto;padding:0 12px;font-size:9pt}
          h1{font-size:20pt}
          table{font-size:8pt}
          th,td{padding:5px}
        }
      </style></head><body>
      <div class="report-toolbar"><button type="button" class="secondary" onclick="window.close()">Close report</button><button type="button" onclick="window.print()">Print / save as PDF</button></div>
      <p class="report-kicker">Structoria | Eurocode 2 | Reinforced-concrete column</p>
      <h1>${escapeHtml(title)}</h1><p class="report-subtitle">Complete design report and calculation record</p>
      ${optionalTitleBlock ? `<section class="report-section"><h2>Project and drawing information</h2><table class="summary-table"><tbody>${optionalTitleBlock}</tbody></table></section>` : ""}
      <p>Generated ${escapeHtml(new Date().toLocaleString())} by the standalone Structoria design engine.</p>
      <p class="status">${escapeHtml(latestColumnResult.status)}</p>
      <section class="report-section"><h2>Design summary</h2><table class="summary-table"><tbody>${summaryRows}</tbody></table></section>
      ${inputSections}
      <section class="report-section"><h2>Calculation steps and intermediate results</h2><p class="section-note">Calculated design stages and axis-specific results from the standalone engine.</p>${calculationSections}</section>
      <section class="report-section"><h2>Final design checks</h2><table class="check-table"><thead><tr><th>Check</th><th>Demand</th><th>Capacity / limit</th><th>Ratio</th><th>Status</th></tr></thead><tbody>${checkRows}</tbody></table></section>
      <p class="engineering-note">Educational design aid only. The responsible structural engineer must independently verify the design basis, load combinations, restraint assumptions, code edition, National Annex, detailing and results before use or issue.</p>
      </body></html>`);
    reportWindow.document.close();
    window.setTimeout(() => {
      if (!reportWindow.closed) {
        reportWindow.focus();
        reportWindow.print();
      }
    }, 250);
    columnCalculationState.textContent = "Report opened. In the print dialog, select Save as PDF as the destination.";
  } catch (error) {
    reportWindow.close();
    columnCalculationState.textContent = error.message || "Unable to open the design report.";
  }
}

renderColumnDesignForm();

function renderDisciplineBreadcrumbs(path) {
  const breadcrumbs = document.querySelector("#discipline-breadcrumbs");
  breadcrumbs.replaceChildren();

  path.forEach((name, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.className = "breadcrumb-separator";
      separator.setAttribute("aria-hidden", "true");
      separator.textContent = "›";
      breadcrumbs.append(separator);
    }

    if (index === path.length - 1) {
      const current = document.createElement("span");
      current.setAttribute("aria-current", "page");
      current.textContent = name === "Civil Engineering" ? "Civil Engineering" : name;
      breadcrumbs.append(current);
      return;
    }

    const breadcrumb = document.createElement("button");
    breadcrumb.type = "button";
    breadcrumb.textContent = name;
    breadcrumb.addEventListener("click", () => navigateCivilEngineering(path.slice(0, index + 1)));
    breadcrumbs.append(breadcrumb);
  });
}

function renderDisciplinePage(path) {
  const topic = findCivilEngineeringTopic(path);
  if (!topic) {
    navigateCivilEngineering(["Civil Engineering"], false);
    return;
  }

  civilEngineeringPath = path;
  disciplinePage.hidden = false;
  disciplinePage.dataset.theme = getDisciplineTheme(path);
  disciplinePage.closest(".main-content").classList.add("discipline-mode");
  restartHeroAutoplay();
  document.querySelector("#discipline-title").textContent = topic.name;
  document.querySelector("#discipline-description").textContent = getTopicDescription(topic);
  document.querySelector("#discipline-heading-icon").textContent = topic.icon ?? "📐";
  document.querySelector("#discipline-kicker").textContent =
    path.length === 1 ? "YOUR LEARNING PATH" : "CIVIL ENGINEERING";
  renderDisciplineBreadcrumbs(path);
  disciplineSearch.value = "";

  const overview = document.querySelector("#learning-overview");
  const hasChildren = Boolean(topic.children?.length);
  const isColumnDesignCase = path.length === 5
    && path[1] === "Structural Engineering"
    && path[2] === "Reinforced Concrete (RC) Design"
    && path[3] === "Compression Members (Columns)"
    && (topic.name === "Columns in Braced Frames (Non-Sway)"
      || topic.name === "Columns in Unbraced Frames (Sway)");
  const isSlabDesignCase = Boolean(topic.slabDesignType);
  overview.hidden = hasChildren;
  disciplineGrid.hidden = !hasChildren;
  disciplineGrid.classList.toggle(
    "column-case-grid",
    hasChildren && path[path.length - 1] === "Compression Members (Columns)",
  );
  columnDesignOpen.hidden = !isColumnDesignCase;
  columnDesigner.hidden = true;
  columnDesignResults.hidden = true;
  columnCalculationState.textContent = "";
  slabDesignOpen.hidden = !isSlabDesignCase;
  slabDesigner.hidden = true;
  slabDesignResults.hidden = true;
  slabCalculationState.textContent = "";
  if (isSlabDesignCase) renderSlabDesignForm(topic.slabDesignType);
  if (isColumnDesignCase) {
    columnDesignForm.elements.structure.value =
      topic.name === "Columns in Braced Frames (Non-Sway)" ? "Braced" : "Unbraced";
  }
  disciplineEmpty.hidden = true;
  disciplineGrid.replaceChildren();

  if (hasChildren) {
    topic.children.forEach((child, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `learning-card course-${["blue", "green", "orange", "amber", "purple", "teal", "pink", "sky", "lime"][index % 9]}`;
      card.dataset.path = JSON.stringify([...path, child.name]);

      const icon = document.createElement("span");
      icon.className = "learning-card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = getTopicIcon(child, index);

      const title = document.createElement("strong");
      title.textContent = child.name;

      const description = document.createElement("span");
      description.className = "learning-card-description";
      description.textContent = getTopicDescription(child);

      const isColumnCase = child.name.startsWith("Columns in ");
      const caseIllustration = isColumnCase ? createColumnCaseIllustration(child.name) : null;
      if (isColumnCase) card.classList.add("has-column-case-art");

      const action = document.createElement("span");
      action.className = "learning-card-action";
      action.textContent = child.children?.length
        ? `${child.children.length} ${child.children.length === 1 ? "topic" : "topics"}`
        : isColumnCase ? "Open design case" : "View course";

      card.append(icon, title, description);
      if (caseIllustration) card.append(caseIllustration);
      card.append(action);
      card.addEventListener("click", () => navigateCivilEngineering(JSON.parse(card.dataset.path)));
      disciplineGrid.append(card);
    });
  } else {
    document.querySelector("#learning-overview-title").textContent = topic.name;
    const isColumnCase = path.includes("Compression Members (Columns)");
    document.querySelector("#learning-overview-description").textContent = isColumnCase
      ? "This selects the frame-stability case in one shared RC column design template. Bracing describes the frame's lateral stability. Section shape, reinforcement arrangement and load effects are design inputs; slenderness and second-order response are checks within the selected case, not separate categories."
      : isSlabDesignCase
        ? "Enter the slab geometry, support conditions, materials and loads. The report explains the workbook's coefficient-based moments, Eurocode 2 checks, reinforcement detailing and quantities, while clearly stating method limits."
        : `Learning materials and worked examples for ${topic.name.toLowerCase()} will be added here.`;
    const columnCaseOverview = document.querySelector("#column-case-overview");
    columnCaseOverview.replaceChildren();
    columnCaseOverview.hidden = !isColumnCase;
    if (isColumnCase) columnCaseOverview.append(createColumnCaseIllustration(topic.name));
    document.querySelector("#overview-icon").textContent = topic.icon ?? "📘";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navigateCivilEngineering(path, addHistory = true) {
  if (!currentUser.loggedIn) {
    pendingCoursePath = path;
    openAuthDialog("login");
    setAuthStatus("Sign in with a verified email address to open courses.");
    showToast("Please sign in before opening a course.");
    return;
  }
  if (addHistory) {
    const route = path.slice(1).map(encodeURIComponent).join("/");
    history.pushState({ civilEngineeringPath: path }, "", `#civil-engineering${route ? `/${route}` : ""}`);
  }
  renderDisciplinePage(path);
  recordVisit();
}

function showHomePage(addHistory = false) {
  disciplinePage.hidden = true;
  disciplinePage.closest(".main-content").classList.remove("discipline-mode");
  restartHeroAutoplay();
  if (addHistory) history.pushState({}, "", "#courses");
}

function syncPageWithLocation() {
  if (!location.hash.startsWith("#civil-engineering")) {
    showHomePage();
    recordVisit();
    return;
  }

  const segments = location.hash.slice("#civil-engineering".length).replace(/^\//, "");
  const path = ["Civil Engineering", ...segments.split("/").filter(Boolean).map((part) => decodeURIComponent(part))];
  if (!authenticationInitialized) return;
  if (!currentUser.loggedIn) {
    pendingCoursePath = path;
    showHomePage();
    openAuthDialog("login");
    setAuthStatus("Sign in with a verified email address to open courses.");
    recordVisit();
    return;
  }
  renderDisciplinePage(path);
  recordVisit();
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  courseCards.forEach((card) => {
    const matches = card.dataset.course.toLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  emptyState.hidden = visibleCount > 0;
});

function updateHeroControls() {
  heroSlideCount.textContent = `${String(currentHeroSlide + 1).padStart(2, "0")} / ${String(heroSlides.length).padStart(2, "0")}`;
  heroDots.querySelectorAll(".hero-slide-dot").forEach((dot, index) => {
    if (index === currentHeroSlide) {
      dot.setAttribute("aria-current", "true");
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  courseCards.forEach((card) => {
    card.setAttribute("aria-pressed", String(card.dataset.course === heroSlides[currentHeroSlide].title));
  });
}

function restartHeroAutoplay() {
  window.clearInterval(heroTimer);
  if (heroPaused || document.hidden || !disciplinePage.hidden || heroReducedMotion.matches) return;
  heroTimer = window.setInterval(() => {
    setHeroSlide(currentHeroSlide + 1, false);
  }, 9000);
}

async function setHeroSlide(index, restartTimer = true) {
  const nextIndex = (index + heroSlides.length) % heroSlides.length;
  const transitionId = ++heroTransitionId;
  const slide = heroSlides[nextIndex];
  const activeImage = heroPhotos.find((image) => image.classList.contains("is-active"));
  const nextImage = heroPhotos.find((image) => image !== activeImage);

  if (!activeImage || !nextImage) return;

  if (nextIndex !== currentHeroSlide) {
    nextImage.src = slide.image;
    try {
      await nextImage.decode();
    } catch {
      if (transitionId !== heroTransitionId) return;
      showToast(`The ${slide.title} photo could not be loaded.`);
      return;
    }

    if (transitionId !== heroTransitionId) return;
    nextImage.classList.add("is-active");
    activeImage.classList.remove("is-active");
  }

  if (transitionId !== heroTransitionId) return;
  currentHeroSlide = nextIndex;
  document.querySelector("#hero-title").textContent = slide.title;
  document.querySelector("#hero-description").textContent = slide.description;
  updateHeroControls();
  if (restartTimer) restartHeroAutoplay();
}

heroSlides.forEach((slide, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "hero-slide-dot";
  dot.setAttribute("aria-label", `Show ${slide.title} photo`);
  dot.addEventListener("click", () => setHeroSlide(index));
  heroDots.append(dot);
});

document.querySelector("#hero-previous").addEventListener("click", () => {
  setHeroSlide(currentHeroSlide - 1);
});

document.querySelector("#hero-next").addEventListener("click", () => {
  setHeroSlide(currentHeroSlide + 1);
});

heroPauseButton.addEventListener("click", () => {
  heroPaused = !heroPaused;
  heroPauseButton.textContent = heroPaused ? "▶" : "Ⅱ";
  heroPauseButton.setAttribute("aria-label", heroPaused ? "Play slideshow" : "Pause slideshow");
  restartHeroAutoplay();
});

document.addEventListener("visibilitychange", restartHeroAutoplay);
heroReducedMotion.addEventListener("change", restartHeroAutoplay);
updateHeroControls();
restartHeroAutoplay();

function getInitials(name) {
  const safeName = (name || "Guest").trim();
  return safeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() || "")
    .join("") || "G";
}

function getAuthToken() {
  return localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey);
}

function saveAuthToken(token, rememberMe) {
  clearAuthToken();
  (rememberMe ? localStorage : sessionStorage).setItem(sessionStorageKey, token);
}

function clearAuthToken() {
  localStorage.removeItem(sessionStorageKey);
  sessionStorage.removeItem(sessionStorageKey);
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || "The server could not complete your request.");
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

function setAuthStatus(message = "", canResend = false) {
  authStatus.textContent = message;
  authStatus.hidden = !message;
  resendVerificationButton.hidden = !canResend;
}

async function recordVisit() {
  try {
    await apiRequest("/api/visits", {
      method: "POST",
      body: JSON.stringify({ page: `${location.pathname}${location.hash}`.slice(0, 300) || "/" }),
    });
  } catch (error) {
    console.error("Could not record this site visit:", error);
  }
}

function syncProfileUi() {
  const isLoggedIn = Boolean(currentUser.loggedIn);
  authActions.hidden = isLoggedIn;
  profileButton.hidden = !isLoggedIn;

  if (!isLoggedIn) {
    profileButton.setAttribute("aria-label", "Open profile settings");
    profileName.textContent = "Guest";
    profileGreeting.textContent = "Welcome";
    profileAvatar.textContent = "G";
    profileAvatarLarge.textContent = "G";
    profileSummaryName.textContent = "Guest";
    profileSummaryEmail.textContent = "guest@structoria.com";
    return;
  }

  const safeName = currentUser.name?.trim() || "Student";
  const initials = getInitials(safeName);

  profileName.textContent = safeName;
  profileGreeting.textContent = "Welcome back,";
  profileAvatar.textContent = initials;
  profileAvatarLarge.textContent = initials;
  profileSummaryName.textContent = safeName;
  profileSummaryEmail.textContent = currentUser.email || "student@structoria.com";
  profileNameField.value = safeName;
  profileEmailField.value = currentUser.email || "";
  emailUpdatesField.checked = currentUser.emailUpdates !== false;
}

async function logoutUser() {
  try {
    if (getAuthToken()) await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Could not revoke the server session:", error);
  }
  clearAuthToken();
  currentUser = { ...defaultUser };
  syncProfileUi();
  profileDialog.close();
  if (!disciplinePage.hidden) showHomePage(true);
  recordVisit();
  showToast("You have been logged out.");
}

function openProfileDialog() {
  if (!currentUser.loggedIn) {
    showToast("Log in to open profile settings.");
    return;
  }
  profileNameField.value = currentUser.name || "";
  profileEmailField.value = currentUser.email || "";
  profilePasswordField.value = "";
  profileCurrentPasswordField.value = "";
  emailUpdatesField.checked = currentUser.emailUpdates !== false;
  profileSummaryName.textContent = currentUser.name || "Guest";
  profileSummaryEmail.textContent = currentUser.email || "guest@structoria.com";
  profileAvatarLarge.textContent = getInitials(currentUser.name || "Guest");
  profileDialog.showModal();
}

function updateUpgradeSummary() {
  const planInfo = pricing[selectedBilling][selectedPlan] || pricing.monthly.pro;
  selectedPlanName.textContent = planInfo.name;
  selectedPlanPrice.textContent = planInfo.label;
}

function setUpgradeMode(billingMode) {
  selectedBilling = billingMode;
  billingTabs.forEach((tab) => {
    const active = tab.dataset.billing === billingMode;
    tab.classList.toggle("is-active", active);
  });
  updateUpgradeSummary();
}

function setSelectedPlan(planKey) {
  selectedPlan = planKey;
  planCards.forEach((card) => {
    const active = card.dataset.plan === planKey;
    card.classList.toggle("is-selected", active);
  });
  updateUpgradeSummary();
}

function setSelectedPayment(method) {
  selectedPayment = method;
  paymentMethods.forEach((button) => {
    const active = button.dataset.payment === method;
    button.classList.toggle("is-selected", active);
  });
}

function openUpgradeDialog() {
  updateUpgradeSummary();
  upgradeDialog.showModal();
}

function closeUpgradeDialog() {
  upgradeDialog.close();
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";

  authTitle.textContent = isSignup ? "Create your account" : "Log in to continue";
  authSubmit.textContent = isSignup ? "Create account" : "Log in";

  authFields.name.classList.toggle("hidden", !isSignup);
  authFields.confirmPassword.classList.toggle("hidden", !isSignup);
  authFields.extras.classList.toggle("hidden", isSignup);
  authFields.name.querySelector("input").required = isSignup;
  authFields.confirmPassword.querySelector("input").required = isSignup;
  authForm.elements.password.autocomplete = isSignup ? "new-password" : "current-password";

  authTabs.forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function openAuthDialog(mode = "login") {
  setAuthStatus();
  setAuthMode(mode);
  authDialog.showModal();
}

function closeAuthDialog() {
  authDialog.close();
  authForm.reset();
  setAuthStatus();
}

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.querySelectorAll(".auth-link").forEach((button) => {
  button.addEventListener("click", () => openAuthDialog(button.dataset.authMode));
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setAuthMode(tab.dataset.authMode);
    setAuthStatus();
  });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = (formData.get("password") || "").toString();

  if (!email || !password) {
    showToast("Please fill in all required fields.");
    return;
  }

  if (authMode === "signup") {
    const name = (formData.get("name") || "").toString().trim();
    const confirmPassword = (formData.get("confirmPassword") || "").toString();

    if (!name) {
      showToast("Please enter your full name to create an account.");
      return;
    }

    if (password.length < 8) {
      showToast("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }

    try {
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setAuthMode("login");
      authForm.elements.email.value = email;
      authForm.elements.password.value = "";
      setAuthStatus("Your account is saved. Check your email and verify your address before signing in.");
      showToast("Verification email sent.");
    } catch (error) {
      setAuthStatus(error.message, error.code === "email_delivery_failed");
      showToast(error.message || "Unable to create your account. Please try again.");
    }
    return;
  }

  try {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        remember: Boolean(formData.get("remember")),
      }),
    });
    saveAuthToken(result.token, Boolean(formData.get("remember")));
    currentUser = { loggedIn: true, ...result.user, plan: "free" };
    syncProfileUi();
    closeAuthDialog();
    showToast("Welcome back! You're logged in.");
    if (pendingCoursePath) {
      const path = pendingCoursePath;
      pendingCoursePath = null;
      navigateCivilEngineering(path);
    }
    recordVisit();
  } catch (error) {
    if (error.code === "email_not_verified") {
      setAuthStatus(error.message, true);
    } else {
      setAuthStatus(error.message);
    }
    showToast(error.message || "Unable to log in. Please try again.");
  }
});

resendVerificationButton.addEventListener("click", async () => {
  const email = authForm.elements.email.value.trim().toLowerCase();
  try {
    const result = await apiRequest("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setAuthStatus(result.message);
  } catch (error) {
    setAuthStatus(error.message);
  }
});

document.querySelector(".auth-close").addEventListener("click", closeAuthDialog);
authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) closeAuthDialog();
});

document.querySelector("[data-upgrade-open]").addEventListener("click", openUpgradeDialog);
document.querySelector(".upgrade-close").addEventListener("click", closeUpgradeDialog);
upgradeDialog.addEventListener("click", (event) => {
  if (event.target === upgradeDialog) closeUpgradeDialog();
});
billingTabs.forEach((tab) => {
  tab.addEventListener("click", () => setUpgradeMode(tab.dataset.billing));
});
planCards.forEach((card) => {
  card.addEventListener("click", () => setSelectedPlan(card.dataset.plan));
});
paymentMethods.forEach((button) => {
  button.addEventListener("click", () => setSelectedPayment(button.dataset.payment));
});
upgradeSubmit.addEventListener("click", () => {
  const plan = pricing[selectedBilling][selectedPlan];
  showToast(`${plan.name} selected via ${paymentLabels[selectedPayment]}. Checkout ready.`);
  closeUpgradeDialog();
});

profileButton.addEventListener("click", openProfileDialog);
document.querySelector(".profile-close").addEventListener("click", () => profileDialog.close());
profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = (profileNameField.value || "").trim() || currentUser.name || "Student";
  const newPassword = profilePasswordField.value;
  const currentPassword = profileCurrentPasswordField.value;
  try {
    const result = await apiRequest("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name,
        emailUpdates: emailUpdatesField.checked,
        currentPassword,
        newPassword,
      }),
    });
    currentUser = { loggedIn: true, ...result.user, plan: "free" };
    profilePasswordField.value = "";
    profileCurrentPasswordField.value = "";
    syncProfileUi();
  } catch (error) {
    showToast(error.message || "Unable to save profile changes. Please try again.");
    return;
  }

  profileDialog.close();
  showToast("Profile updated successfully.");
});

logoutButton.addEventListener("click", logoutUser);

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector(".nav-link.active")?.classList.remove("active");
    document.querySelector('.nav-link[aria-current="page"]')?.removeAttribute("aria-current");
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  });
});

courseCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (!currentUser.loggedIn) {
      if (card.dataset.course === "Civil Engineering") {
        pendingCoursePath = ["Civil Engineering"];
      }
      openAuthDialog("login");
      setAuthStatus("Sign in with a verified email address to open courses.");
      showToast("Please sign in before opening a course.");
      return;
    }

    const slideIndex = heroSlides.findIndex((slide) => slide.title === card.dataset.course);
    if (slideIndex !== -1) setHeroSlide(slideIndex);

    if (card.dataset.course === "Civil Engineering") {
      navigateCivilEngineering(["Civil Engineering"]);
      return;
    }

    searchInput.value = card.dataset.course;
    searchInput.dispatchEvent(new Event("input"));
    document.querySelector("#courses-title").textContent = `${card.dataset.course} Courses`;
    document.querySelector("#courses").scrollIntoView({ behavior: "smooth" });
  });
});

disciplineSearch.addEventListener("input", () => {
  const query = disciplineSearch.value.trim().toLowerCase();
  let visibleCount = 0;

  disciplineGrid.querySelectorAll(".learning-card").forEach((card) => {
    const matches = card.textContent.toLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  disciplineEmpty.hidden = visibleCount > 0 || !query;
});

columnDesignOpen.addEventListener("click", () => {
  columnDesigner.hidden = false;
  columnDesignOpen.hidden = true;
  columnDesigner.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#column-design-back").addEventListener("click", () => {
  columnDesigner.hidden = true;
  columnDesignOpen.hidden = false;
});

columnDesignForm.addEventListener("submit", submitColumnDesign);
columnDownloadPdf.addEventListener("click", printColumnReport);

slabDesignOpen.addEventListener("click", () => {
  slabDesigner.hidden = false;
  slabDesignOpen.hidden = true;
  slabDesigner.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#slab-design-back").addEventListener("click", () => {
  slabDesigner.hidden = true;
  slabDesignOpen.hidden = false;
});

slabDesignForm.addEventListener("submit", submitSlabDesign);
slabDownloadPdf.addEventListener("click", printSlabReport);

document.querySelector("#discipline-back").addEventListener("click", () => showHomePage(true));

document.querySelector("#overview-back").addEventListener("click", () => {
  navigateCivilEngineering(civilEngineeringPath.slice(0, -1));
});

window.addEventListener("popstate", syncPageWithLocation);
window.addEventListener("hashchange", syncPageWithLocation);

document.querySelector("#how-it-works").addEventListener("click", () => {
  infoDialog.showModal();
});

document.querySelector(".dialog-close").addEventListener("click", () => {
  infoDialog.close();
});

infoDialog.addEventListener("click", (event) => {
  if (event.target === infoDialog) infoDialog.close();
});

infoDialog.querySelector(".dialog-cta").addEventListener("click", () => {
  infoDialog.close();
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

async function initializeAuthentication() {
  const verificationToken = new URLSearchParams(location.search).get("verify");
  if (verificationToken) {
    try {
      const result = await apiRequest("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ token: verificationToken }),
      });
      setAuthMode("login");
      openAuthDialog("login");
      setAuthStatus(result.message);
    } catch (error) {
      openAuthDialog("login");
      setAuthStatus(error.message);
    } finally {
      history.replaceState({}, "", `${location.pathname}${location.hash}`);
    }
  }

  try {
    if (getAuthToken()) {
      const result = await apiRequest("/api/auth/me");
      currentUser = { loggedIn: true, ...result.user, plan: "free" };
    } else {
      currentUser = { ...defaultUser };
    }
  } catch (error) {
    clearAuthToken();
    currentUser = { ...defaultUser };
    if (error instanceof TypeError) {
      showToast("Could not connect to Structoria. Start the backend server and reload this page.");
    } else {
      showToast(error.message || "Unable to restore your sign-in.");
    }
  }
  authenticationInitialized = true;
  syncProfileUi();
  syncPageWithLocation();
}

initializeAuthentication();
