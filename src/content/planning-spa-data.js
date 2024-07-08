export default {
  mail: {
    api: 'https://script.google.com/macros/s/AKfycbz7Y-SmFkSuUKMxgHFfoXMUwyRqUsIGUj_1pafMWC1zIeFTPGtM7RmBPOX8zfiJvos/exec',
    to: ['ysk1122.dev@gmail.com'],
  },
  questions: [
    {
      qid: 'How do you decide on a tour?',
      message: 'How do you decide on a tour?',
      multiple: false,
      options: [
        { label: 'Activity', value: 'Activity' },
        { label: 'Our proposal', value: 'Our proposal' },
        { label: 'Or, you need photographer', value: 'Or, you need photographer' },
      ],
      next: {
        qid: 'What kind of activity is it?',
        message: 'What kind of activity is it?',
        multiple: true,
        options: [
          { label: 'Karaoke', value: 'Karaoke' },
          { label: 'Bowling', value: 'Bowling' },
        ],
        next: {
          qid: 'Do you want to spend money?',
          message: 'Do you want to spend money?',
          multiple: false,
          options: [
            { label: 'Spend money', value: 'Spend money' },
            { label: 'Free', value: 'Free' },
          ],
          eachNext: [
            // on 'Spend money'
            {
              qid: 'How do you want to pay?',
              message: 'How do you want to pay?',
              multiple: false,
              options: [
                { label: 'Advance payment', value: 'Advance payment' },
                { label: 'Paying on a case-by-case basis', value: 'Paying on a case-by-case basis' },
              ],
            },
            // on 'Free'
            {
              qid: 'Is it OK if I mainly walk?',
              message: 'Is it OK if I mainly walk?',
              multiple: false,
              options: [
                { label: 'No ploblem', value: 'No ploblem' },
                { label: 'Spend some money to not walk', value: 'Spend some money to not walk' },
              ],
            }
          ],
        },
      },
    },
  ],
}
