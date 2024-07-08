<script>
import SPADATA from './planning-spa-data.js';
import AnglesLeft from '../components/icons/AnglesLeft.vue';
import AngleRight from '../components/icons/AngleRight.vue';
import XMark from '../components/icons/XMark.vue';

export default {
  name: 'PlanningSPA',
  components: {
    AnglesLeft, AngleRight, XMark,
  },
  data() {
    return {
      /** 全回答
       * @type {{ message: String, answers: {{ index: Number, value: String }}[] }}
       */
      answers: [],
      // インポートした問題
      questions: SPADATA.questions[0],
      // 現在操作中の問題
      stage: {
        depth: 0, // ステージの連番 / answers の Index と対応させる
        qs: {}, // 問題
        ans: [],  // 回答
        btnStatus: [], // 選択肢ボタンのクリック状態リスト
        key: -1,  // ステージのライフサイクル
        qsEnded: 0, // > 0 のとき、SPADATA.questions が終わったことを示す
      },
      vmUserMessage: '',
      vmUserEmail: '',
      loaderViewOpened: false,  // ローディング画面の表示トグル
      isMailSended: false, // メール送信のフラグ
      popupview: {
        opened: false, // 開閉の状態フラグ
        closing: false, // 閉じている最中のフラグ
        message: 'There is an input error.',
      }
    };
  },
  methods: {
    /**
     * 次の質問ブロックを用意する
     * @param optIndex 現在の選択肢が multiple の場合、どの選択肢が選ばれたのか、Index を渡す
     */
    setStage(optIndex = -1) {
      // qs.next または qs.eachNext を qs にセット
      const { next, eachNext } = this.stage.qs;
      // next, eachNext ともに undefined のとき、SPADATA.questions は終わり、最終質問に移る
      if (next === undefined && eachNext === undefined) {
        this.stage.qsEnded = 1;
        return;
      }
      if (eachNext) this.stage.qs = eachNext[optIndex];
      else this.stage.qs = next;
      // 回答リストおよび選択状態管理リスト初期化
      this.stage.ans = [];
      this.stage.btnStatus = [...Array(this.stage.qs.options.length)].fill(false);
      this.stage.depth += 1;
    },
    /**
     * Key を更新して、ステージを描写する
     */
    incrementStageKey() {
      this.stage.key += 1;
    },
    /**
     * 選択肢がクリックされたときに起動
     * @param e Vue によるイベントオブジェクト
     */
    onSelectOption(e) {
      const { value, index } = e.target.dataset;
      const idx = Number(index);
      console.log('Option is selected.', { value, index }, e);
      if (this.stage.btnStatus[idx]) {
        // すでに選択されているものが押された場合、選択状態を解除する
        const thisAnsIndex = this.stage.ans
          .map((obj) => obj.index).indexOf(idx);
        this.stage.ans.splice(thisAnsIndex, 1);
        this.stage.btnStatus[idx] = false;
      } else {
        this.stage.ans.push({ value, index: idx });
        this.stage.btnStatus[idx] = true;
      }
      if (this.stage.qs.multiple) return; // multiple の場合ここで終了
      this.answers.push({
        message: this.stage.qs.message,
        answers: this.stage.ans,
      });
      this.setStage(index);
      this.incrementStageKey();
    },
    onMultipleSubmit() {
      this.answers.push({
        message: this.stage.qs.message,
        answers: this.stage.ans,
      });
      // multiple での質問分岐は禁止
      this.setStage();
      this.incrementStageKey();
    },
    onFinalQuestSubmit({ question, vmname }) {
      const value = this[vmname];
      console.log({ question, vmname });
      // Email は必須
      if (!value && vmname === 'vmUserEmail') {
        this.showPopup('Enter your email.');
        return;
      }
      this.answers.push({
        message: question,
        answers: [{ index: 0, value: value??'', }],
      });
      this.stage.qsEnded++;
      return;
    },
    async onOrderSubmit(e) {
      try {
        console.log('Sending message...');
        this.loaderViewOpened = true;
        const mailer = await Promise.all(SPADATA.mail.to.map((to) => this.sendMail(to)));
        this.isMailSended = true;
        this.loaderViewOpened = false;
      } catch (error) {
        console.log('Error occured: ', error);
        this.showPopup('Sorry. An error occurred during data transmission. Reload the page and try again.');
      }
    },
    async sendMail(to) {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', '【Trip.Tokyo】新しいリクエストがありました');
      const messages = this.answers.map((ans) => {
        const q = ans.message;
        const a = (ans.answers.length === 1)
          ? ans.answers[0].value
          : ans.answers.map((obj) => obj.value).join(',');
        return `Q: ${q}\nA: ${a}`;
      });
      formData.append('body', messages.join('\n'));
      
      const response = await fetch(SPADATA.mail.api, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data;
    },
    onBackClick() {
      // ひとつまえの Stage SN
      const prevStageSN = this.stage.depth - 1;
      // ステージのリセット
      Object.assign(this.stage, {
        depth: 0,
        qs: this.questions,
        ans: [],
        btnStatus: [],
        // qsEnded: 0, // > 0 のとき、SPADATA.questions が終わったことを示す
      });
      // 初期状態から、ひとつ前のステージまで進めていく
      for (let i = 0; i < prevStageSN; i++) {
        const thisAnswers = this.answers[i].answers;
        this.setStage(thisAnswers[0].index);
      }
      // ひとつ前のステージの回答をセット
      const prevAnswers = this.answers[prevStageSN].answers;
      const prevAnswerIdxs = prevAnswers.map((ans) => ans.index);
      this.stage.btnStatus = this.stage.btnStatus
        .map((status, idx) => prevAnswerIdxs.includes(idx));
      // 最後の回答を削除
      this.answers.pop();
      this.incrementStageKey();
    },
    onFinalBackClick(e) {
      const { qsEnded } = this.stage;
      if (qsEnded === 1) {
        this.stage.qsEnded = 0;
        this.onBackClick();
        return;
      }
      const prevAnswer = this.answers.pop();
      const { backvmname } = e.target.dataset;
      this[backvmname] = prevAnswer.answers[0];
      this.stage.qsEnded = qsEnded - 1;
    },
    disableEnter(e) {
      const key = e.keyCode || e.charCode || 0;
      // 13はEnterキーのキーコード
      if (key == 13) {
        // アクションを行わない
        e.preventDefault();
      }
    },
    showPopup(message) {
      Object.assign(this.popupview, {
        message,
        closing: false,
        opened: true,
      });
    },
    closePopup() {
      this.popupview.closing = true;
      setTimeout(() => {
        this.popupview.opened = false;
      }, 600);
    }
  },
  created() {
    Object.assign(this.stage, {
      qs: this.questions,
      btnStatus: [...Array(this.questions.options.length)].fill(false),
    });
  },
};
</script>

<template>
  <div class="planning-spa">
    <form class="question-form" name="trip_requests" method="post" action="/planning" v-if="!isMailSended">
    <div class="question" v-if="stage.qsEnded < 1 && stage.qs" :key="stage.key">
      <h2 class="question">{{ stage.qs.message }}</h2>
      <div class="options">
        <label class="option" v-for="(opt, optIndex) of stage.qs.options" :key="optIndex">
          <button type="button" class="option__btn"
            @click="onSelectOption"
            :data-value="opt.value"
            :data-index="optIndex"
            :class="{ selected: stage.btnStatus[optIndex] }"
          >{{ opt.label }}</button>
        </label>
      </div>
      <div class="actions">
        <label class="back" v-if="optIndex > 0">
          <button type="button" class="back__btn"
            @click="onBackClick"
          ><AnglesLeft /><span>Back</span></button>
        </label>
        <label class="next" v-if="stage.qs.multiple">
          <button type="button" class="next__btn"
            @click="onMultipleSubmit"
          ><span>Next</span><AngleRight /></button>
        </label>
      </div>
    </div>
    <div v-if="stage.qsEnded === 1">
      <h2 class="question">If you have something to tell us, please write it down.</h2>
      <div class="options">
        <label class="input">
          <textarea class="input__message"
            placeholder="Do you have anything to tell us?"
            v-model="vmUserMessage"
          ></textarea>
        </label>
      </div>
      <div class="actions">
        <label class="back">
          <button type="button" class="back__btn"
            @click="onFinalBackClick"
          ><AnglesLeft /><span>Back</span></button>
        </label>
        <label class="next">
          <button type="button"
            class="next__btn"
            @click="onFinalQuestSubmit({ question: 'Message', vmname: 'vmUserMessage' })"
            ><span>Next</span><AngleRight /></button>
        </label>
      </div>
    </div>
    <div v-if="stage.qsEnded === 2">
      <h2 class="question">Finally, please give us your email address.</h2>
      <div class="options">
        <label class="input">
          <input class="input__email" type="email"
            placeholder="Your Email"
            v-model="vmUserEmail"
            @keypress="disableEnter"
          />
        </label>
      </div>
      <div class="actions">
        <label class="back">
          <button type="button" class="back__btn"
            @click="onFinalBackClick"
            data-backvmname="vmUserMessage"
          ><AnglesLeft /><span>Back</span></button>
        </label>
        <label class="next">
          <button type="button" class="next__btn"
            @click="onFinalQuestSubmit({ question: 'Email', vmname: 'vmUserEmail' })"
            ><span>Next</span><AngleRight /></button>
        </label>
      </div>
    </div>
    <div v-if="stage.qsEnded === 3">
      <h2 class="question">Please review and submit your request.</h2>
      <div class="orders">
        <div class="order-item" v-for="(ans, ansIndex) of answers" :key="ansIndex">
          <h3 class="order-item__title">{{ ans.message }}</h3>
          <p class="order-item__answers" v-if="ans.answers.length === 0">
            {{ ans.answers[0].value }}
          </p>
          <p class="order-item__answers" v-else>
            {{ ans.answers.map((obj) => obj.value).join(',') }}
          </p>
        </div>
      </div>
      <div class="actions">
        <label class="back">
          <button type="button" class="back__btn"
            data-backvmname="vmUserEmail"
            @click="onFinalBackClick"
          ><AnglesLeft /><span>Back</span></button>
        </label>
        <label class="next">
          <button type="button" class="next__btn"
            @click="onOrderSubmit"
          ><span>Send</span><AngleRight /></button>
        </label>
      </div>
    </div>
    </form><!-- End of <form class="question-form"> -->
    <div class="thankyou" v-if="isMailSended">
      <p>Thank you very much. Please wait for our reply.</p>
    </div>
    <div v-if="loaderViewOpened" class="loaderview">
      <p class="loaderview-text">Sending...</p>
    </div>
    <div v-if="popupview.opened" class="popupview" :class="{ hide: popupview.closing }">
      <p>{{ popupview.message }}</p><XMark @click="closePopup" />
    </div>
  </div>
</template>

<style lang="scss">
  .loaderview {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: white;

    p {
      font-size: 4rem;
    }
  }
  .popupview {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    background-color: var(--accent);
    opacity: .98;
    box-shadow: var(--box-shadow);
    transition: .6s;

    &.hide {
      opacity: 0;
    }

    p {
      margin: 0;
      padding: 0 1rem;
      font-size: 3rem;
      color: var(--white);
    }
    .icons {
      position: absolute;
      right: .3rem;
      top: .3rem;
      display: block;
      height: 1.9rem;
      width: 1.9rem;
      color: var(--white);
      fill: white;
      &:hover {
        cursor: pointer;
        // fill: rgb(var(--black));
        opacity: .8;
      }
    }
  }
	form {
		.question {
			text-align: center;
			font-size: 2rem;
		}
		.options {
			text-align: center;
      .option {
        display: inline-block;
        &__btn {
          font-size: 1.6rem;
          padding: .3rem 1rem;
          margin: .3rem .5rem;
          border-radius: .8rem;
          border: 2px solid rgb(var(--black));
          box-shadow: 0 3px 5px rgba(0, 0, 0, .3);
          &:hover {
            cursor: pointer;
            box-shadow: var(--box-shadow);
            border: 2px solid var(--accent);
          }
          &.selected {
            background-color: var(--accent-light);
            box-shadow: var(--box-shadow);
            color: var(--white);
          }
        }
      }
      .input {
        display: block;
        &__message, &__email {
          font-size: 1.6rem;
          padding: 1rem;
          border-radius: .8rem;
          border: 2px solid rgb(var(--black));
          &:focus {
            border: 2px solid var(--accent);
          }
        }
        &__message {
          // box-shadow: 0 3px 5px rgba(0, 0, 0, .3);
          width: calc(100% - 2rem - 4px); // padding, border
          resize: vertical;
        }
        &__email {
          // box-shadow: 0 3px 5px rgba(0, 0, 0, .3);
          width: calc(100% - 2rem - 4px); // padding, border
        }
      }
		}

    .actions {
      display: flex;
      justify-content: space-between;
      .back, .next {
        display: inline-block;
        &__btn {
          display: flex;
          vertical-align: middle;
          gap: .6rem;
          font-size: 1.6rem;
          padding: .3rem 1rem;
          margin: .3rem .5rem;
          border-radius: .8rem;
          box-shadow: 0 3px 5px rgba(0, 0, 0, .3);
          &:hover {
            cursor: pointer;
            box-shadow: var(--box-shadow);
            border: 2px solid var(--accent);
          }
        }
      }
      .back {
        &__btn {
          border: 2px solid rgb(var(--gray));
          &.selected {
            background-color: var(--accent-light);
            box-shadow: var(--box-shadow);
            color: var(--white);
          }
        }
      }
      .next {
        &__btn {
          border: 2px solid var(--accent-light);
        }
      }
      .icons {
        height: 1.7rem;
        width: 1.7rem;
      }
		}

    .orders {
      text-align: center;
      .order-item {
        &__title {
          font-size: 1.6rem;
        }
        &__answers {
          font-size: 1.4rem;
          margin: 0;
        }
      }
    }
	}
</style>