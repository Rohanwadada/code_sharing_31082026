export const MAX_WORDS = 4000;
export const MAX_CHARACTERS = 25000;

export const PROMPT_TEMPLATES = [
  {
    id: 1,
    label: 'Sales',
    icon: 'sales',
    text: 'I want to transition into a Sales role. Create a realistic 6-month roadmap with weekly goals, beginner-friendly resources, and project ideas I can add to my portfolio.',
  },
  {
    id: 2,
    label: 'Agentic AI',
    icon: 'robot',
    text: 'I am familiar with large language models and want to learn how to build agentic AI systems. Create a learning roadmap that covers tools, architectures, and best practices.',
  },
  {
    id: 3,
    label: 'Project Manager',
    icon: 'person',
    text: 'I am an engineer who wants to move into product management. Please create a learning roadmap that covers discovery, prioritization, and stakeholder communication.',
  },
  {
    id: 4,
    label: 'Software Engineer',
    icon: 'code',
    text: 'I am a frontend developer and want to become a full-stack engineer. I already know JavaScript and React. Please design a structured 6-month learning roadmap covering backend, databases, and system design.',
  },
  {
    id: 5,
    label: 'Data Analyst',
    icon: 'chart',
    text: 'I work in operations and often deal with reports, but I want to truly understand data. I know basic Excel. Create a learning roadmap to help me learn SQL, Python, and data analysis step by step.',
  },
];

/**
 *
 * @param {String} text Input text given
 * @param {Number} maxWords Maximum allowed words in input
 * @param {Number} maxChars Maximum Characters allowed in input
 * @returns Input trimmed within the defined limits
 */
export const applyLimits = (text, maxWords, maxChars) => {
  // enforce character limit
  let out = text.slice(0, maxChars);

  // enforce word limit
  const words = out.trim().split(/\s+/);
  if (words.length <= maxWords) return out;

  return words.slice(0, maxWords).join(' ');
};

export const dummyMessages = [
  {
    message_id: '1',
    role: 'human',
    content: [
      {
        type: 'text',
        data: { text: 'I want to be an AI engineer' },
      },
      {
        type: 'artifact',
        subtype: 'time_commitment',
        data: {
          name: 'Essentials',
        },
      },
    ],
  },
  {
    message_id: '2',
    role: 'assistant',
    content: [
      {
        type: 'text',
        data: { text: 'What is the learning depth you want to go for?' },
      },
      {
        type: 'action',
        interaction_id: 'depth_selector',
        selection_mode: 'single',
        disable_on_select: true,
        layout: 'chip_list',
        data: {
          title: null,
          options: [
            {
              label: 'Crash (Zero to basics, fast)',
              value: 'tier_1',
              action: 'SEND',
            },
            {
              label: 'Essentials (Must-know core skills)',
              value: 'tier_2',
              action: 'SEND',
            },
            {
              label: 'Practical (Learn by doing)',
              value: 'tier_3',
              action: 'SEND',
            },
            {
              label: 'Advanced (Beyond the basics)',
              value: 'tier_4',
              action: 'SEND',
            },
            {
              label: 'Pro (Industry-ready mastery)',
              value: 'tier_5',
              action: 'SEND',
            },
          ],
        },
      },
    ],
  },
  {
    message_id: '1',
    role: 'human',
    content: [
      {
        type: 'text',
        data: { text: 'Pro (Industry-ready mastery)' },
      },
    ],
  },
  {
    message_id: '3',
    role: 'assistant',
    content: [
      {
        type: 'thought',
        collapsed_label: 'Thinking about your roadmap...',
        data: {
          text: 'Analyzing IT support skills vs Cyber Sec requirements...',
        },
      },
      {
        type: 'text',
        data: {
          text: 'Your prompt is ready. You may generate the roadmap or modify the prompt.',
        },
      },
      {
        type: 'action',
        interaction_id: 'roadmap_generation_cta',
        selection_mode: 'single',
        disable_on_select: false,
        layout: 'call_to_action_card',
        data: {
          title:
            'Lorem ipsum dolor sit amet consectetur. Feugiat bibendum sagittis ultrices dignissim. Vestibulum lectus suspendisse egestas nulla nibh nulla ante. Sit blandit ultricies et purus quisque vitae massa hac justo. Nec ut eu non cursus. Nibh nisl dignissim porttitor viverra vehicula feugiat. Nam facilisis aliquam turpis sagittis molestie fermentum. Id dolor quam duis sit facilisis. Est volutpat mauris sapien ultrices tempus a. Metus massa id congue facilisis sed eget ut nisl sed. Sed accumsan malesuada odio vitae nisi euismod purus urna. Nibh nisl proin aliquet sed dui',
          options: [
            {
              id: 'edit_prompt',
              label: 'Edit Prompt',
              icon: 'edit',
              action: 'EDIT_MESSAGE',
              value: 'cmd_edit',
            },
            {
              id: 'generate_roadmap',
              icon: 'spark',
              label: 'Shifu, Generate my Roadmap',
              action: 'GENERATE_ROADMAP',
              value: 'gen_roadmap',
            },
            {
              id: 'recommend_course',
              icon: 'spark',
              label: 'Shifu, give me course recommendations',
              action: 'RECOMMEND_COURSE',
              value: 'recommend_course',
            },
            {
              id: 'generate_content',
              icon: 'scholar',
              label: 'Shifu, generate learning materials',
              action: 'GENERATE_CONTENT',
              value: 'gen_content',
            },
          ],
        },
      },
    ],
  },
  {
    message_id: '10',
    role: 'assistant',
    content: [
      {
        type: 'text',
        data: { text: "Let's review it and decide your next action." },
      },
      {
        type: 'action',
        interaction_id: 'post_roadmap_action_cta',
        layout: 'post_roadmap_action_cta',
        data: {
          title: null,
          options: [
            {
              id: 'recommend_courses',
              icon: 'spark',
              label: 'Shifu, give me course recommendations',
              action: 'RECOMMEND_COURSES',
              value: 'recommend_courses',
            },
            {
              id: 'generate_content',
              label: 'Shifu, generate learning materials',
              icon: 'scholar',
              action: 'GENERATE_CONTENT',
              value: 'gen_content',
            },
          ],
        },
      },
    ],
  },
  {
    message_id: '54',
    role: 'assistant',
    content: [
      {
        type: 'text',
        data: { text: 'Here your personalized roadmap!' },
      },
      {
        type: 'artifact',
        subtype: 'roadmap',
        data: {
          name: 'Roadmap title',
          version: 'version 1',
          r_id: 'rid_123',
          dsl: '# roadmap...',
        },
      },
    ],
  },
  {
    message_id: '54',
    role: 'assistant',
    content: [
      {
        type: 'text',
        data: { text: 'Here your personalized roadmap!' },
      },
    ],
    status: 'loading',
  },
];

export const ThreadType = {
  ROADMAP_GENERATION: 'roadmap_generation',
  ROADMAP_DOUBT: 'roadmap_doubt',
};
