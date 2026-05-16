const jsPsych = initJsPsych({
    on_finish: function() {
        document.body.innerHTML = `
            <div style="max-width:600px;margin:100px auto;text-align:center;font-family:sans-serif;">
                <h2>Thank you for participating!</h2>
                <p>Your responses have been saved.</p>
            </div>
        `;
    }
});

// When false, only the plain "associated with" condition is shown.
// Set to true to include risk/probability context conditions (full Study 3).
const include_context = true;

const subject_id = jsPsych.randomization.randomID(10);
const filename = `${subject_id}.csv`;

const consent_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="consent-text"> <h2>Consent Agreement</h2> <p> Please read this consent agreement carefully before deciding whether to participate in this experiment. </p> <p> <strong>Description:</strong> You are invited to participate in a research study about language and language learning. The purpose of the research is to understand how people learn new words. This research will be conducted through the Prolific platform, including participants from the US, UK, and Canada. If you decide to participate in this research, you will learn and use new words. </p> <p> <strong>Time Involvement:</strong> The task will last the amount of time advertised on Prolific. You are free to withdraw from the study at any time. </p> <p> <strong>Risks and Benefits:</strong> Study data will be stored securely, in compliance with Stanford University standards, minimizing the risk of confiden-tiality breach. This study advances our scientific understanding of how people learn new languages. We cannot and do not guarantee or promise that you will receive any benefits from this study. </p> <p> <strong>Compensation:</strong> You will receive payment in the amount advertised on Prolific. If you do not complete this study, you will receive prorated payment based on the time that you have spent. Additionally, you may be eligible for bonus payments as described in the instructions. </p> <p> <strong>Participant's Rights:</strong> If you have read this form and have decided to participate in this project, please understand your participation is voluntary and you have the right to withdraw your consent or discontinue participation at any time without penalty or loss of benefits to which you are otherwise entitled. The alternative is not to participate. You have the right to refuse to answer particular questions. The results of this research study may be presented at scientific or professional meetings or published in scientific journals. Your individual privacy will be maintained in all published and writ-ten data resulting from the study. In accordance with scientific norms, the data from this study may be used or shared with other researchers for future research (after removing personally identifying information) without additional consent from you. </p> <p> <strong>Contact Information:</strong> If you have any questions, concerns or complaints about this research, its procedures, risks and benefits, contact the Protocol Director, Robert Hawkins (<a href="mailto:rdhawkins@stanford.edu">rdhawkins@stanford.edu</a>, 217-549-6923). </p> <p> <strong>Independant Contact:</strong> If you are not satisfied with how this study is being conducted, or if you have any concerns, com-plaints, or general questions about the research or your rights as a participant, please contact the Stanford Institutional Review Board (IRB) to speak to someone independent of the research team at 650-723-2480 or toll free at 1-866-680-2906, or email at irbnonmed@stanford.edu. You can also write to the Stanford IRB, Stanford University, 1705 El Camino Real, Palo Alto, CA 94306. Please save or print a copy of this page for your records. </p> <p> <strong>If you agree to participate in this research, please click "I agree"</strong> </p></br> </div>`,
    choices: ['I agree', 'I do not agree'],
    button_html: [
        '<button class="consent-button agree">%choice%</button>',
        '<button class="consent-button disagree">%choice%</button>'
    ],
    data: {
        trial_type: 'consent'
    },
    on_finish: function(data) {
        data.consent_response = data.response === 0 ? 'agree' : 'disagree';
        data.consent_timestamp = new Date().toISOString();
        if (data.response === 1) {
            jsPsych.endExperiment(`
                <div class="instruction-text">
                    <h2>Thank you</h2>
                    <p>You have chosen not to participate. Thank you for your time.</p>
                </div>
            `);
        }
    }
};

// Practice trial: temporally unambiguous — "was typing" establishes Maria started first.
const practice_choices = jsPsych.randomization.shuffle([
    { text: 'Maria began her report first', type: 'correct' },
    { text: 'The phone rang first',         type: 'incorrect' }
]);

const practice_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <p>Before we begin, here is a practice question to familiarize you with the format.</p>
        <p>Suppose you read the following piece of information:</p>
        <p class="trial-statement">&ldquo;While Maria was typing her report, the phone rang.&rdquo;</p>
        <p class="trial-question">Which of the following is most likely?</p>
    `,
    choices: practice_choices.map(c => c.text),
    data: { task: 'practice' },
    on_finish: function(data) {
        data.response_text = practice_choices[data.response].text;
        data.response_type = practice_choices[data.response].type;
    }
};

const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "1UVMbfCIL2Da",
    filename: filename,
    data_string: () => {
        const csv = jsPsych.data.get().csv();
        console.log('DataPipe: sending', csv.length, 'bytes to', filename);
        return csv;
    },
    on_finish: function(data) {
        console.log('DataPipe response:', data.success, data.response);
        if (!data.success) {
            jsPsych.data.get().localSave('csv', filename);
        }
    }
};

// Load stimuli from CSV, then build and run the experiment.
// Note: fetch() requires a web server — run `python3 -m http.server` from the
// repo root and open http://localhost:8000/src/index.html for local testing.
fetch('../materials/stimuli.csv')
    .then(r => r.text())
    .then(csv => {
        const rows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;
        const conditions_map = {};
        for (const row of rows) {
            if (!conditions_map[row.condition]) {
                conditions_map[row.condition] = {
                    name: row.condition,
                    has_context: row.has_context === 'true'
                };
            }
            conditions_map[row.condition][row.version] = {
                statement: row.statement,
                xy:        row.xy,
                yx:        row.yx,
                neither:   row.neither
            };
        }
        const conditions = Object.values(conditions_map);

        const active_conditions = include_context
            ? conditions
            : conditions.filter(c => !c.has_context);

        let timeline = [];

        timeline.push(consent_trial);

        timeline.push({
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <h2>Welcome!</h2>
                <p>You will be asked a few simple questions about the possible relationship
                between different things. The questions are unrelated to one another.</p>
                <p>For each question, you will read a statement and choose the most likely
                interpretation from the options presented.</p>
                <p>Please respond thoughtfully.</p>
            `,
            choices: ['Begin']
        });

        timeline.push(practice_trial);

        // Shuffle the order of conditions for this participant
        const shuffled_conditions = jsPsych.randomization.shuffle([...active_conditions]);

        const base_versions = Math.random() < 0.5
            ? ['A', 'B', 'A', 'B', 'A']
            : ['B', 'A', 'B', 'A', 'B'];
        const version_order = jsPsych.randomization.shuffle(base_versions);
        let version_index = 0;

        for (const condition of shuffled_conditions) {
            const version = version_order[version_index++ % version_order.length];
            const v = condition[version];

            // Build and shuffle the three answer choices
            const choices_info = jsPsych.randomization.shuffle([
                { text: v.xy,      type: 'xy' },
                { text: v.yx,      type: 'yx' },
                { text: v.neither, type: 'neither' }
            ]);

            timeline.push({
                type: jsPsychHtmlButtonResponse,
                stimulus: `
                    <p>Suppose you read the following piece of information:</p>
                    <p class="trial-statement">&ldquo;${v.statement}&rdquo;</p>
                    <p class="trial-question">Which of the following is most likely?</p>
                `,
                choices: choices_info.map(c => c.text),
                data: {
                    task: 'causal_judgment',
                    condition: condition.name,
                    version: version,
                    column_name: `${condition.name}_${version}`,
                    statement: v.statement,
                    choice_order: choices_info.map(c => c.type).join(',')
                },
                on_load: function() {
                    const buttons = document.querySelectorAll('.jspsych-html-button-response-button button');
                    const maxHeight = Math.max(...Array.from(buttons).map(b => b.offsetHeight));
                    buttons.forEach(b => { b.style.height = maxHeight + 'px'; });
                },
                on_finish: function(data) {
                    data.response_text = choices_info[data.response].text;
                    data.response_type = choices_info[data.response].type;
                }
            });
        }

        timeline.push({
            type: jsPsychSurveyText,
            questions: [{
                prompt: 'Please describe, in a few words, what you were asked to do in this experiment?',
                name: 'explain',
                rows: 3,
                required: true
            }],
            data: { task: 'screening' }
        });

        timeline.push({
            type: jsPsychSurveyText,
            questions: [{
                prompt: 'Do you have any comments or feedback about this study? (optional)',
                name: 'comments',
                rows: 3,
                required: false
            }],
            data: { task: 'comments' }
        });

        timeline.push({
            type: jsPsychSurveyText,
            questions: [
                { prompt: 'What is your age? (optional)',                                          name: 'age',             columns: 10, required: false },
                { prompt: 'What is your gender? (optional)',                                        name: 'gender',          columns: 30, required: false },
                { prompt: 'What is your native language? (optional)',                               name: 'native_language', columns: 30, required: false },
                { prompt: 'What is the highest level of education you have completed? (optional)',  name: 'education',       columns: 40, required: false }
            ],
            data: { task: 'demographics' }
        });

        timeline.push(save_data);

        timeline.push({
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <h2>You have completed the study!</h2>
                <p>Thank you for your participation. Click below to finish.</p>
            `,
            choices: ['Finish']
        });

        jsPsych.run(timeline);
    })
    .catch(err => {
        document.body.innerHTML = `
            <div style="max-width:600px;margin:100px auto;font-family:sans-serif;color:#c00;">
                <h2>Could not load stimuli</h2>
                <p>${err.message}</p>
                <p>Make sure you are serving the experiment from a web server, not opening
                the file directly. From the repo root, run:<br>
                <code>python3 -m http.server</code><br>
                then open <code>http://localhost:8000/src/index.html</code>.</p>
            </div>
        `;
    });
